import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import { base32 } from "@scure/base";

type Network = 'mainnet' | 'testnet';

interface WalletContextValue {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  network: Network;
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  fetchLiveCells: () => Promise<Array<{ txHash: string; index: number; args: string; capacity: string; did: string, data: string, didMetadata: string }>>;
  destroyDidCell: (args: string) => Promise<string>;
  updateDidKey: (args: string, didKey: string) => Promise<string>;
  updateAka: (args: string, aka: string) => Promise<string>;
  transferDidCell: (args: string, receiverAddress: string) => Promise<string>;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};

const WalletInnerProvider: React.FC<{ children: React.ReactNode; network: Network }> = ({ children, network }) => {
  const { open, disconnect: cccDisconnect } = ccc.useCcc();
  const signer = ccc.useSigner();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!signer) return;
    (async () => {
      const addr = await signer.getRecommendedAddress();
      setAddress(addr);
      setIsConnected(true);
      try {
        const capacity = await signer.getBalance();
        setBalance(ccc.fixedPointToString(capacity));
      } catch {
        setBalance(null);
      }
    })();
  }, [signer]);

  const connect = useCallback(async () => {
    await open();
  }, [open]);

  const disconnect = useCallback(async () => {
    try {
      await cccDisconnect();
    } catch {
      // 忽略断开连接时的错误
    }
    setIsConnected(false);
    setAddress(null);
    setBalance(null);
  }, [cccDisconnect]);

  const value: WalletContextValue = {
    isConnected,
    address,
    balance,
    network,
    connect,
    disconnect,
    fetchLiveCells: async () => {
      if (!signer || !address) return [];
      try {
        // 仅查询 did:ckb 相关 cells：根据 codehash 过滤
        const didScriptInfo = await signer.client.getKnownScript(ccc.KnownScript.DidCkb);
        const didCodeHash = didScriptInfo?.codeHash;
        if (!didCodeHash) throw new Error('未找到 did:ckb 脚本的 codehash');
        const cells = await signer.findCells({
          script: {
            codeHash: didCodeHash,
            hashType: 'type',
            args: "0x",
          },
        }, true, 'desc', 20);
        const result: Array<{ txHash: string; index: number; args: string; capacity: string; did: string, data: string, didMetadata: string }> = [];
        for await (const cell of cells) {
          const txHash = cell.outPoint.txHash;
          const index = Number(cell.outPoint.index);
          try {
            const data = cell.outputData ?? '0x';
            const didData = ccc.didCkb.DidCkbData.decode(data);
            const didDoc = didData.value.document;      
            const didMetadata = JSON.stringify(didDoc);
            const args = ccc.bytesFrom(cell.cellOutput.type.args.slice(0, 42)); // 20 bytes Type args
            const did = `did:ckb:${base32.encode(args).toLowerCase()}`;
            result.push({
              txHash,
              index,
              args: cell.cellOutput.type.args,
              capacity: ccc.fixedPointToString(cell.cellOutput.capacity),
              did,
              data,
              didMetadata,
            });
          } catch (error) {
            console.error(`处理 cell ${txHash}:${index} 时出错:`, error);
          }
        }
        return result;
      } catch {
        return [];
      }
    },
    destroyDidCell: async (args: string) => {
      if (!signer) throw new Error('钱包未连接');
      const { tx: destroyDidTx } = await ccc.didCkb.destroyDidCkb({ client: signer.client, id: args });
      await destroyDidTx.completeInputsByCapacity(signer);
      await destroyDidTx.completeFeeBy(signer);
      const sent = await signer.sendTransaction(destroyDidTx);
      return sent;
    },
    updateDidKey: async (args: string, newDidKey: string) => {
      if (!signer) throw new Error('钱包未连接');
      const address = await signer.getRecommendedAddressObj();
      const { tx: updateDidTx } = await ccc.didCkb.transferDidCkb({
        client: signer.client,
        id: args,
        receiver: address.script,
        data: (_, data) => {
          (data.value.document as { verificationMethods: { atproto?: string } }).verificationMethods.atproto = newDidKey;
          return data;
        },
      });
      await updateDidTx.completeInputsByCapacity(signer);
      await updateDidTx.completeFeeBy(signer);
      const sent = await signer.sendTransaction(updateDidTx);
      return sent;
    },
    updateAka: async (args: string, aka: string) => {
      if (!signer) throw new Error('钱包未连接');
      const address = await signer.getRecommendedAddressObj();
      const { tx: updateAkaTx } = await ccc.didCkb.transferDidCkb({
        client: signer.client,
        id: args,
        receiver: address.script,
        data: (_, data) => {
          const akaObj = JSON.parse(aka);
          (data.value.document as { alsoKnownAs?: Record<string, unknown> }).alsoKnownAs = akaObj;
          return data;
        },
      });
      await updateAkaTx.completeInputsByCapacity(signer);
      await updateAkaTx.completeFeeBy(signer);
      const sent = await signer.sendTransaction(updateAkaTx);
      return sent;
    },
    transferDidCell: async (args: string, receiverAddress: string) => {
      if (!signer) throw new Error('钱包未连接');
      const receiver = await ccc.Address.fromString(receiverAddress.trim(), signer.client);
      const { tx } = await ccc.didCkb.transferDidCkb({
        client: signer.client,
        id: args,
        receiver: receiver.script,
      });
      await tx.completeInputsByCapacity(signer);
      await tx.completeFeeBy(signer);
      const sent = await signer.sendTransaction(tx);
      return sent;
    },
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const WalletProvider: React.FC<{ children: React.ReactNode; network?: Network }> = ({ children, network = 'testnet' }) => {
  const defaultClient = useMemo(() => {
    return network === 'mainnet' ? new ccc.ClientPublicMainnet() : new ccc.ClientPublicTestnet();
  }, [network]);

  return (
    <ccc.Provider defaultClient={defaultClient} clientOptions={[
      { name: 'CKB Testnet', client: new ccc.ClientPublicTestnet() },
      { name: 'CKB Mainnet', client: new ccc.ClientPublicMainnet() },
    ]}>
      <WalletInnerProvider network={network}>{children}</WalletInnerProvider>
    </ccc.Provider>
  );
};
