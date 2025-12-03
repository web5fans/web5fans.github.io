import React, { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { ccc } from '@ckb-ccc/connector-react';

type Network = 'mainnet' | 'testnet';

interface WalletContextValue {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  network: Network;
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
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
    } catch {}
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
