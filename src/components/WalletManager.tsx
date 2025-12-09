import React, { useState } from 'react';
import { useWallet } from '@/provider/WalletProvider';
import { buildTxUrl } from '@/utils/explorer';
import { storage } from '@/utils/storage';
import { DidCkbData } from '@/utils/didMolecule';
import * as cbor from '@ipld/dag-cbor';
import { getDidKeyFromPublicHex } from '@/utils/didKey';
import { encryptData } from '@/utils/crypto';
import { ccc } from '@ckb-ccc/core';

interface Props {
  isConnected: boolean;
  address?: string | null;
  balance?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  loading: boolean;
  network?: 'mainnet' | 'testnet';
  onFetchLiveCells?: () => Promise<Array<{ txHash: string; index: number; capacity: string; did: string, data: string, didMetadata: string }>>;
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
  const [didCells, setDIDCells] = useState<Array<{ txHash: string; index: number; capacity: string; did: string, data: string, didMetadata: string }>>([]);
  const [copiedDocKey, setCopiedDocKey] = useState<string | null>(null);
  const [copiedDidKey, setCopiedDidKey] = useState<string | null>(null);
  const [destroyed, setDestroyed] = useState<Record<string, { txHash: string; url: string }>>({});
  const [updated, setUpdated] = useState<Record<string, { txHash: string; url: string }>>({});
  const [showPwdModalKey, setShowPwdModalKey] = useState<string | null>(null);
  const [pwdInput, setPwdInput] = useState('');
  const [exporting, setExporting] = useState(false);
  const shortAddr = (addr?: string | null) => {
    if (!addr) return '';
    const a = addr.replace(/^\s+|\s+$/g, '');
    if (a.length <= 16) return a;
    return `${a.slice(0, 8)}...${a.slice(-8)}`;
  };
  const copyAddr = async () => {
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
    setDIDCells(list);
  };

  const formatJson = (s: string) => {
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  };

  const copyDID = async (key: string, did: string) => {
    try {
      await navigator.clipboard.writeText(did);
      setCopiedDidKey(key);
      setTimeout(() => setCopiedDidKey(null), 2000);
    } catch (err) {
      console.error('复制 DID 失败:', err);
    }
  };

  const copyDIDMetadata = async (key: string) => {
    const content = didCells.find(c => `${c.txHash}-${c.index}` === key)?.didMetadata || '';
    try {
      await navigator.clipboard.writeText(content);
      setCopiedDocKey(key);
      setTimeout(() => setCopiedDocKey(null), 2000);
    } catch (err) {
      console.error('复制 DID Metadata 失败:', err);
    }
  };

  const { destroyDidCell, updateDidCell } = useWallet();
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
  const updateCell = async (cell: { txHash: string; index: number; didMetadata: string; data: string }) => {
    try {
      const kd = storage.getKey();
      if (!kd) {
        alert('请先在密钥管理器创建或导入密钥');
        return;
      }
      const didKey = getDidKeyFromPublicHex(kd.publicKey);
      if (!didKey) {
        alert('无法计算 DID Key');
        return;
      }
      const ok = window.confirm(`更新 DID Metadata 属于危险操作，可能不可恢复。\n将把 verificationMethods.atproto 更新为当前密钥管理器中的 DID Key：\n${didKey}\n确认继续？`);
      if (!ok) return;
      const newMetadata = JSON.parse(cell.didMetadata || '{}');
      if (!newMetadata.verificationMethods) newMetadata.verificationMethods = {};
      newMetadata.verificationMethods.atproto = didKey;

      const cborBytes = cbor.encode(newMetadata);
      const docHex = ccc.hexFrom(cborBytes);

      const oldDidData = DidCkbData.fromBytes(cell.data || '0x');
      const newDid = DidCkbData.from({ value: { document: docHex, localId: oldDidData.value.localId ?? undefined } });
      const newOutputData = newDid.toBytes();

      const sent = await updateDidCell(cell.txHash, cell.index, ccc.hexFrom(newOutputData));
      const key = `${cell.txHash}-${cell.index}`;
      setUpdated((prev) => ({ ...prev, [key]: { txHash: sent, url: buildTxUrl(sent, network ?? 'testnet') } }));
    } catch (err) {
      console.error('更新失败:', err);
      alert((err as Error).message);
    }
  };
  const exportCredential = async (cell: { did: string }) => {
    const kd = storage.getKey();
    if (!kd) {
      alert('请先在密钥管理器创建或导入密钥');
      return;
    }
    setShowPwdModalKey(cell.did);
  };
  const confirmExport = async () => {
    if (!showPwdModalKey) return;
    try {
      setExporting(true);
      const kd = storage.getKey();
      if (!kd) throw new Error('密钥不存在');
      const payload = {
        did: showPwdModalKey,
        signKey: '0x' + kd.privateKey,
        walletAddress: address ?? '',
      };
      const json = JSON.stringify(payload);
      const base64 = await encryptData(json, pwdInput.trim());
      if (base64 === 'error') throw new Error('加密失败');
      const blob = new Blob([base64], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'web5-login-credential.txt';
      a.click();
      URL.revokeObjectURL(url);
      setShowPwdModalKey(null);
      setPwdInput('');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
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
                地址：<span className="font-mono">{shortAddr(address)}</span>
              </div>
              <button
                onClick={copyAddr}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                复制完整地址
              </button>
              {copiedTip && (
                <div className="mt-1 text-green-600 text-sm">已复制完整地址</div>
              )}
              <div>余额：{balance ?? '加载中...'} CKB</div>
              <div className="mt-1">网络：{network ?? '-'}</div>
              <div className="mt-3">
                <div className="mb-2 flex items-center gap-2">
                  <span>DID Cells:</span>
                  <button onClick={fetchCells} className="text-blue-600 hover:text-blue-800 underline">刷新</button>
                </div>
                {didCells.length === 0 ? (
                  <div className="text-gray-500">暂无数据</div>
                ) : (
                  <ul className="space-y-2 font-mono text-xs">
                    {didCells.map((cell, i) => (
                      <li key={`${cell.txHash}-${cell.index}-${i}`}>
                        <div>
                          <a
                            href={buildTxUrl(cell.txHash, network ?? 'testnet')}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {cell.txHash}
                          </a>
                          {` [${cell.index}] • ${cell.capacity} CKB`}
                        </div>
                        <div className="break-all text-gray-600">data: {cell.data}</div>
                        <div className="break-all text-gray-600 font-bold flex items-center gap-2">DID: <span className="font-mono">{cell.did}</span>
                          <button
                            onClick={() => copyDID(`${cell.txHash}-${cell.index}`, cell.did)}
                            className="text-blue-600 hover:text-blue-800 text-xs underline"
                          >
                            复制
                          </button>
                          {copiedDidKey === `${cell.txHash}-${cell.index}` && (
                            <span className="text-green-600 text-xs">已复制</span>
                          )}
                        </div>
                        {cell.didMetadata && (
                          <div className="text-gray-700">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">DID Metadata</span>
                              <button
                                onClick={() => copyDIDMetadata(`${cell.txHash}-${cell.index}`)}
                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                              >
                                复制
                              </button>
                              {copiedDocKey === `${cell.txHash}-${cell.index}` && (
                                <span className="text-green-600 text-xs">已复制</span>
                              )}
                            </div>
                            <pre className="whitespace-pre-wrap break-words bg-gray-100 border rounded p-2 text-gray-800">
                              {formatJson(cell.didMetadata)}
                            </pre>
                          </div>
                        )}
                        <div className="mt-2">
                          <button
                            onClick={() => destroyCell(cell.txHash, cell.index)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1 px-2 rounded"
                          >
                            销毁
                          </button>
                          {destroyed[`${cell.txHash}-${cell.index}`] && (
                            <div className="mt-1 text-xs text-gray-700">
                              <div>已提交交易：<span className="font-mono break-all">{destroyed[`${cell.txHash}-${cell.index}`].txHash}</span></div>
                              <a href={destroyed[`${cell.txHash}-${cell.index}`].url} target="_blank" rel="noreferrer" className="text-blue-600 underline">在区块链浏览器查看</a>
                            </div>
                          )}
                          <div className="mt-2">
                            <button
                              onClick={() => updateCell({ txHash: cell.txHash, index: cell.index, didMetadata: cell.didMetadata, data: cell.data })}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1 px-2 rounded"
                            >
                              更新
                            </button>
                            {updated[`${cell.txHash}-${cell.index}`] && (
                              <span className="ml-2 text-xs">
                                <div>已提交交易：<span className="font-mono break-all">{updated[`${cell.txHash}-${cell.index}`].txHash}</span></div>
                                <a href={updated[`${cell.txHash}-${cell.index}`].url} target="_blank" rel="noreferrer" className="text-blue-600 underline">在区块链浏览器查看</a>
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <button
                              onClick={() => exportCredential({ did: cell.did })}
                              className="bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold py-1 px-2 rounded"
                            >
                              导出登录凭证
                            </button>
                          </div>
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
    {showPwdModalKey && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
          <div className="text-lg font-semibold text-gray-800 mb-3">设置凭证导出密码</div>
          <input
            type="password"
            value={pwdInput}
            onChange={e => setPwdInput(e.target.value)}
            placeholder="至少 8 位"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={() => { setShowPwdModalKey(null); setPwdInput(''); }}
              disabled={exporting}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg border"
            >
              取消
            </button>
            <button
              onClick={confirmExport}
              disabled={exporting || pwdInput.trim().length < 8}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg"
            >
              {exporting ? '导出中...' : '确认导出'}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">使用 AES-GCM + PBKDF2 强化加密，务必保存好密码。</div>
        </div>
      </div>
    )}
    </>
  );
};
