export type CkbNetwork = 'mainnet' | 'testnet';

export const getExplorerBase = (network: CkbNetwork) => {
  return network === 'mainnet'
    ? 'https://explorer.nervos.org'
    : 'https://testnet.explorer.nervos.org';
};

export const buildTxUrl = (hash: string, network: CkbNetwork) => {
  const base = getExplorerBase(network);
  const normalized = hash.startsWith('0x') ? hash : `0x${hash}`;
  return `${base}/transaction/${normalized}`;
};

