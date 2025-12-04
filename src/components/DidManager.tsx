import React, { useState } from 'react';
import { useWallet } from '@/provider/WalletProvider';
import { buildTxUrl } from '@/utils/explorer';

export const DidManager: React.FC = () => {
  const { network, destroyDidCell } = useWallet();
  const [txHash, setTxHash] = useState('');
  const [index, setIndex] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ txHash: string; url: string } | null>(null);

  const onDestroy = async () => {
    setError(null);
    setResult(null);
    const i = Number(index);
    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash) || Number.isNaN(i)) {
      setError('请输入有效的 tx hash（0x...64位）与 index');
      return;
    }
    const ok = window.confirm('销毁 DID Cell 属于危险且不可恢复的操作，确认继续？');
    if (!ok) return;
    try {
      setLoading(true);
      const sent = await destroyDidCell(txHash, i);
      const url = buildTxUrl(sent, network);
      setResult({ txHash: sent, url });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🆔</span>
        DID 身份管理（销毁）
      </h2>
      {error && (
        <div className="mb-4 p-3 rounded-lg border text-red-600 bg-red-50 border-red-200">{error}</div>
      )}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DID Cell tx hash</label>
          <input
            type="text"
            placeholder="0x...64位哈希"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value.trim())}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">index</label>
          <input
            type="number"
            placeholder="输出 index（数字）"
            value={index}
            onChange={(e) => setIndex(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <div>
          <button
            onClick={onDestroy}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg"
          >
            {loading ? '销毁中...' : '销毁 DID Cell'}
          </button>
        </div>
        {result && (
          <div className="text-sm text-gray-700">
            <div>已提交交易：<span className="font-mono break-all">{result.txHash}</span></div>
            <a href={result.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">在区块链浏览器查看</a>
          </div>
        )}
      </div>
    </div>
  );
};

