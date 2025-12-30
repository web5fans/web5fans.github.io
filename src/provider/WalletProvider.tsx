import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import { base32 } from "@scure/base";
import { DidCkbData } from '@/utils/didMolecule';
import * as cbor from "@ipld/dag-cbor";

type Network = 'mainnet' | 'testnet';

interface WalletContextValue {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  network: Network;
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  fetchLiveCells: () => Promise<Array<{ txHash: string; index: number; capacity: string; did: string, data: string, didMetadata: string }>>;
  destroyDidCell: (txHash: string, index: number) => Promise<string>;
  updateDidCell: (txHash: string, index: number, newOutputData: string) => Promise<string>;
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
        const didCodeHash = network === 'mainnet' ? '0x4a06164dc34dccade5afe3e847a97b6db743e79f5477fa3295acf02849c5984a' : '0x510150477b10d6ab551a509b71265f3164e9fd4137fcb5a4322f49f03092c7c5';
        const cells = await signer.findCells({
          script: {
            codeHash: didCodeHash,
            hashType: 'type',
            args: "0x",
          },
        }, true, 'desc', 10);
        const result: Array<{ txHash: string; index: number; capacity: string; did: string, data: string, didMetadata: string }> = [];
        for await (const cell of cells) {
          const txHash = cell.outPoint.txHash;
          const index = Number(cell.outPoint.index);
          try {
            const data = cell.outputData ?? '0x';
            const didData = DidCkbData.fromBytes(data);
            const didDoc = didData.value.document;
            const didDocJson = cbor.decode(ccc.bytesFrom(didDoc));          
            const didMetadata = JSON.stringify(didDocJson);
            const args = ccc.bytesFrom(cell.cellOutput.type.args.slice(0, 42)); // 20 bytes Type args
            const did = `did:ckb:${base32.encode(args).toLowerCase()}`;
            result.push({
              txHash,
              index,
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
    destroyDidCell: async (txHash: string, index: number) => {
      if (!signer) throw new Error('钱包未连接');
      const didDepCell = network === 'mainnet' ? {
        outPoint: {
          txHash: '0xe2f74c56cdc610d2b9fe898a96a80118845f5278605d7f9ad535dad69ae015bf',
          index: '0x0',
        },
        depType: 'code',
      } : {
        outPoint: {
          txHash: '0x0e7a830e2d5ebd05cd45a55f93f94559edea0ef1237b7233f49f7facfb3d6a6c',
          index: '0x0',
        },
        depType: 'code',
      };
      const destoryDidTx = ccc.Transaction.from({
        cellDeps: [didDepCell,],
        inputs: [
          {
            previousOutput: {
              txHash,
              index,
            },
            since: 0,
          }
        ],
        outputs: [],
      });
      await destoryDidTx.completeInputsByCapacity(signer);
      await destoryDidTx.completeFeeBy(signer);
      const sent = await signer.sendTransaction(destoryDidTx);
      return sent;
    },
    updateDidCell: async (txHash: string, index: number, newOutputData: string) => {
      if (!signer) throw new Error('钱包未连接');
      const didDepCell = network === 'mainnet' ? {
        outPoint: {
          txHash: '0xe2f74c56cdc610d2b9fe898a96a80118845f5278605d7f9ad535dad69ae015bf',
          index: '0x0',
        },
        depType: 'code',
      } : {
        outPoint: {
          txHash: '0x0e7a830e2d5ebd05cd45a55f93f94559edea0ef1237b7233f49f7facfb3d6a6c',
          index: '0x0',
        },
        depType: 'code',
      };
      const client = signer.client;
      const tx = await client.getTransaction(txHash);
      const originalOutput = tx?.transaction?.outputs?.[Number(index)];
      if (!originalOutput) throw new Error('无法获取原始输出');
      const updateTx = ccc.Transaction.from({
        cellDeps: [didDepCell],
        inputs: [
          {
            previousOutput: {
              txHash,
              index,
            },
            since: 0,
          }
        ],
        outputs: [originalOutput],
        outputsData: [newOutputData],
      });
      await updateTx.completeInputsByCapacity(signer);
      await updateTx.completeFeeBy(signer);
      const sent = await signer.sendTransaction(updateTx);
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
