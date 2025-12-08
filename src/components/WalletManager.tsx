import React, { useState } from 'react';
import { useWallet } from '@/provider/WalletProvider';
import { buildTxUrl } from '@/utils/explorer';
import { DidCkbData } from '@/utils/didMolecule';
import * as cbor from "@ipld/dag-cbor";

interface Props {
  isConnected: boolean;
  address?: string | null;
  balance?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  loading: boolean;
  network?: 'mainnet' | 'testnet';
  onFetchLiveCells?: () => Promise<Array<{ txHash: string; index: number; capacity: string; data: string }>>;
}

export const WalletManager: React.FC<Props> = ({
  isConnected,
  address,
  balance,
  onConnect,
  onDisconnect,
  loading,
  network,
  onFetchLiveCells,
}) => {
  const [copiedTip, setCopiedTip] = useState(false);
  const [cells, setCells] = useState<Array<{ txHash: string; index: number; capacity: string; data: string }>>([]);
  const [parsed, setParsed] = useState<Record<string, string>>({});
  const [copiedDocKey, setCopiedDocKey] = useState<string | null>(null);
  const [destroyed, setDestroyed] = useState<Record<string, { txHash: string; url: string }>>({});
  const short = (addr?: string | null) => {
    if (!addr) return '';
    const a = addr.replace(/^\s+|\s+$/g, '');
    if (a.length <= 16) return a;
    return `${a.slice(0, 8)}...${a.slice(-8)}`;
  };
  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopiedTip(true);
      setTimeout(() => setCopiedTip(false), 2000);
    } catch (err) {
      console.error('复制地址失败:', err);
    }
  };
  const fetchCells = async () => {
    if (!onFetchLiveCells) return;
    const list = await onFetchLiveCells();
    setCells(list);
    const p: Record<string, string> = {};
    for (const c of list) {
      try {
        const didData = DidCkbData.fromBytes(c.data);
        const didDoc = didData.value.document;
        const didDocJson = cbor.decode(new Uint8Array(didDoc.slice(2).match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))));
        p[`${c.txHash}-${c.index}`] = JSON.stringify(didDocJson);
      } catch (err) {
        console.error('解析DID数据失败:', err);
        p[`${c.txHash}-${c.index}`] = '解析失败';
      }
    }
    setParsed(p);
  };

  const formatJson = (s: string) => {
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  };

  const copyDoc = async (key: string) => {
    const content = parsed[key] ? formatJson(parsed[key]) : '';
    try {
      await navigator.clipboard.writeText(content);
      setCopiedDocKey(key);
      setTimeout(() => setCopiedDocKey(null), 2000);
    } catch (err) {
      console.error('复制 DID Document 失败:', err);
    }
  };

  const { destroyDidCell } = useWallet();
  const destroyCell = async (txHash: string, index: number) => {
    const ok = window.confirm('销毁 DID Cell 属于危险且不可恢复的操作，确认继续？');
    if (!ok) return;
    try {
      const sent = await destroyDidCell(txHash, index);
      const key = `${txHash}-${index}`;
      setDestroyed((prev) => ({ ...prev, [key]: { txHash: sent, url: buildTxUrl(sent, network ?? 'testnet') } }));
    } catch (err) {
      console.error('销毁失败:', err);
      alert((err as Error).message);
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">👛</span>
        DID 身份管理
      </h2>
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-600">
          {isConnected ? (
            <div>
              <div className="mb-1">
                地址：<span className="font-mono">{short(address)}</span>
              </div>
              <div>余额：{balance ?? '加载中...'} CKB</div>
              <div className="mt-1">网络：{network ?? '-'}</div>
              <button
                onClick={copy}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                复制完整地址
              </button>
              {copiedTip && (
                <div className="mt-1 text-green-600 text-sm">已复制完整地址</div>
              )}
              <div className="mt-3">
                <div className="mb-2 flex items-center gap-2">
                  <span>DID Cells：</span>
                  <button onClick={fetchCells} className="text-blue-600 hover:text-blue-800 underline">刷新</button>
                </div>
                {cells.length === 0 ? (
                  <div className="text-gray-500">暂无数据</div>
                ) : (
                  <ul className="space-y-2 font-mono text-xs">
                    {cells.map((c, i) => (
                      <li key={`${c.txHash}-${c.index}-${i}`}>
                        <div>{c.txHash} [{c.index}] • {c.capacity} CKB</div>
                        <div className="break-all text-gray-600">data: {c.data}</div>
                        {parsed[`${c.txHash}-${c.index}`] && (
                          <div className="text-gray-700">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">DID Document</span>
                              <button
                                onClick={() => copyDoc(`${c.txHash}-${c.index}`)}
                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                              >
                                复制
                              </button>
                              {copiedDocKey === `${c.txHash}-${c.index}` && (
                                <span className="text-green-600 text-xs">已复制</span>
                              )}
                            </div>
                            <pre className="whitespace-pre-wrap break-words bg-gray-100 border rounded p-2 text-gray-800">
                              {formatJson(parsed[`${c.txHash}-${c.index}`])}
                            </pre>
                          </div>
                        )}
                        <div className="mt-2">
                          <button
                            onClick={() => destroyCell(c.txHash, c.index)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1 px-2 rounded"
                          >
                            销毁该 DID Cell
                          </button>
                          {destroyed[`${c.txHash}-${c.index}`] && (
                            <div className="mt-1 text-xs text-gray-700">
                              <div>已提交交易：<span className="font-mono break-all">{destroyed[`${c.txHash}-${c.index}`].txHash}</span></div>
                              <a href={destroyed[`${c.txHash}-${c.index}`].url} target="_blank" rel="noreferrer" className="text-blue-600 underline">在区块链浏览器查看</a>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div>未连接</div>
          )}
        </div>
        <div className="flex gap-3">
          {!isConnected ? (
            <button
              onClick={onConnect}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg"
            >
              连接钱包
            </button>
          ) : (
            <button
              onClick={onDisconnect}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg"
            >
              断开连接
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
