import React, { useState } from 'react';

interface Props {
  isConnected: boolean;
  address?: string | null;
  balance?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  loading: boolean;
}

export const WalletManager: React.FC<Props> = ({
  isConnected,
  address,
  balance,
  onConnect,
  onDisconnect,
  loading,
}) => {
  const [copiedTip, setCopiedTip] = useState(false);
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
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">👛</span>
        钱包连接管理
      </h2>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {isConnected ? (
            <div>
              <div className="mb-1">
                地址：<span className="font-mono">{short(address)}</span>
              </div>
              <div>余额：{balance ?? '加载中...'} CKB</div>
              <button
                onClick={copy}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                复制完整地址
              </button>
              {copiedTip && (
                <div className="mt-1 text-green-600 text-sm">已复制完整地址</div>
              )}
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
