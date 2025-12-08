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
  fetchLiveCells: () => Promise<Array<{ txHash: string; index: number; capacity: string; data: string }>>;
  destroyDidCell: (txHash: string, index: number) => Promise<string>;
  computeDid: (txHash: string, outIndex: number) => Promise<string>;
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
        const result: Array<{ txHash: string; index: number; capacity: string; data: string }> = [];
        for await (const cell of cells) {
          result.push({
            txHash: cell.outPoint.txHash,
            index: Number(cell.outPoint.index),
            capacity: ccc.fixedPointToString(cell.cellOutput.capacity),
            data: cell.outputData ?? '0x',
          });
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
    computeDid: async (txHash: string, outIndex: number) => {
      if (!signer) throw new Error('钱包未连接');
      const cccClient = signer.client; 
      const tx = await cccClient.getTransaction(txHash);
      if (!tx?.transaction?.inputs?.length) throw new Error('无法获取交易输入');
      const input0 = tx.transaction.inputs[0];
      const typeId = ccc.hashTypeId(input0, outIndex);

      const args = ccc.bytesFrom(typeId.slice(0, 42)); // 20 bytes Type ID
      const did = base32.encode(args).toLowerCase()
      return `did:ckb:${did}`;
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
