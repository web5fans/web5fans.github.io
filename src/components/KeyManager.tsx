import React, { useState, useEffect } from 'react';
import { storage, SigningKeyData } from '../utils/storage';
import { Secp256k1 } from '@web5/crypto';
import { AesGcm } from '@web5/crypto';
import { Pbkdf2 } from '@web5/crypto';
import { CryptoUtils } from '@web5/crypto';
import { base58btc } from 'multiformats/bases/base58';

interface KeyManagerProps {
  onKeyChange?: (keyPair: SigningKeyData | null) => void;
}

export const KeyManager: React.FC<KeyManagerProps> = ({ onKeyChange }) => {
  const [keyData, setKeyData] = useState<SigningKeyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning' | null; message: string }>({ type: null, message: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'export' | 'import' | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    const existingKey = storage.getKey();
    if (existingKey) {
      setKeyData(existingKey);
      onKeyChange?.(existingKey);
    }
  }, [onKeyChange]);

  const generateKeyPair = async () => {
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const privateJwk = await Secp256k1.generateKey();
      const publicJwk = await Secp256k1.getPublicKey({ key: privateJwk });

      const privateBytes = await Secp256k1.privateKeyToBytes({ privateKey: privateJwk });
      const publicBytesUncompressed = await Secp256k1.publicKeyToBytes({ publicKey: publicJwk });
      const publicBytes = await Secp256k1.compressPublicKey({ publicKeyBytes: publicBytesUncompressed });

      const privateKey = Array.from(privateBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const publicKey = Array.from(publicBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const newKeyData: SigningKeyData = {
        privateKey,
        publicKey,
        createdAt: new Date().toISOString(),
      };

      storage.setKey(newKeyData);
      setKeyData(newKeyData);
      onKeyChange?.(newKeyData);
      setStatus({ type: 'success', message: '密钥创建成功（secp256k1）！' });
    } catch (error) {
      console.error('Error generating key pair:', error);
      setStatus({ type: 'error', message: '密钥创建失败，请重试' });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteKey = () => {
    setIsLoading(true);
    try {
      storage.removeKey();
      setKeyData(null);
      onKeyChange?.(null);
      setShowDeleteConfirm(false);
      setStatus({ type: 'warning', message: '密钥已删除' });
    } catch (error) {
      console.error('Error deleting key:', error);
      setStatus({ type: 'error', message: '密钥删除失败' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ type: 'success', message: '公钥已复制到剪贴板' });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setStatus({ type: 'error', message: '复制失败，请手动复制' });
    }
  };

  const doExport = async (password: string) => {
    if (!keyData) {
      setStatus({ type: 'error', message: '没有可导出的密钥' });
      return;
    }

    if (!password || password.length < 8) {
      setStatus({ type: 'error', message: '密码无效，至少8位' });
      return;
    }

    try {
      setIsLoading(true);
      const salt = CryptoUtils.randomBytes(16);
      const iv = CryptoUtils.randomBytes(12);
      const derived = await Pbkdf2.deriveKey({
        hash: 'SHA-256',
        password: new TextEncoder().encode(password),
        salt,
        iterations: 100_000,
        length: 256,
      });

      const aesKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes: derived });
      const plaintext = new TextEncoder().encode(JSON.stringify(keyData));
      const ciphertext = await AesGcm.encrypt({ key: aesKey, data: plaintext, iv });

      const payload = {
        version: 1,
        kdf: { algo: 'PBKDF2', hash: 'SHA-256', iterations: 100000 },
        iv: Array.from(iv),
        salt: Array.from(salt),
        data: Array.from(ciphertext),
        createdAt: keyData.createdAt,
      };

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date(keyData.createdAt).toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `web5-signing-key-${ts}.json`; 
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: '导出成功，已下载加密文件' });
    } catch (error) {
      console.error('Error exporting key:', error);
      setStatus({ type: 'error', message: '导出失败，请重试' });
    } finally {
      setIsLoading(false);
    }
  };

  const doImport = async (file: File, password: string) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!password) {
        setStatus({ type: 'error', message: '未提供密码，导入取消' });
        return;
      }

      const iv = new Uint8Array(payload.iv);
      const salt = new Uint8Array(payload.salt);
      const data = new Uint8Array(payload.data);

      const derived = await Pbkdf2.deriveKey({
        hash: 'SHA-256',
        password: new TextEncoder().encode(password),
        salt,
        iterations: payload.kdf?.iterations ?? 100000,
        length: 256,
      });
      const aesKey = await AesGcm.bytesToPrivateKey({ privateKeyBytes: derived });
      const plaintext = await AesGcm.decrypt({ key: aesKey, data, iv });
      const obj: SigningKeyData = JSON.parse(new TextDecoder().decode(plaintext));

      if (storage.hasKey()) {
        const confirmOverwrite = window.confirm('已存在签名密钥，继续导入会覆盖现有内容，是否继续？');
        if (!confirmOverwrite) {
          setStatus({ type: 'warning', message: '导入已取消' });
          return;
        }
      }

      storage.setKey(obj);
      setKeyData(obj);
      onKeyChange?.(obj);
      setStatus({ type: 'success', message: '导入成功，已加载密钥' });
    } catch (error) {
      console.error('Error importing key:', error);
      setStatus({ type: 'error', message: '导入失败，请检查密码或文件内容' });
    }
  };

  const openExportModal = () => {
    setPasswordMode('export');
    setPasswordInput('');
    setShowPasswordModal(true);
  };

  const openImportModalWithFile = (file: File) => {
    setPendingFile(file);
    setPasswordMode('import');
    setPasswordInput('');
    setShowPasswordModal(true);
  };

  const confirmPasswordAction = async () => {
    const pwd = passwordInput.trim();
    if (passwordMode === 'export') {
      await doExport(pwd);
      setShowPasswordModal(false);
    } else if (passwordMode === 'import' && pendingFile) {
      await doImport(pendingFile, pwd);
      setShowPasswordModal(false);
      setPendingFile(null);
    }
  };

  const cancelPasswordAction = () => {
    setShowPasswordModal(false);
    setPendingFile(null);
    setPasswordMode(null);
    setPasswordInput('');
  };

  const getStatusColor = () => {
    switch (status.type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return '';
    }
  };

  const hexToBytes = (hex: string): Uint8Array => {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const len = clean.length / 2;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return out;
  };

  const getDidKey = (pubHex: string): string => {
    try {
      const pub = hexToBytes(pubHex);
      const prefix = new Uint8Array([0xE7, 0x01]);
      const prefixed = new Uint8Array(prefix.length + pub.length);
      prefixed.set(prefix, 0);
      prefixed.set(pub, prefix.length);
      const mb = base58btc.encode(prefixed);
      return `did:key:${mb}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="mr-2">🔐</span>
        密钥管理
      </h2>

      {status.type && (
        <div className={`mb-4 p-3 rounded-lg border ${getStatusColor()}`}>
          {status.message}
        </div>
      )}

      {!keyData ? (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            您还没有创建签名密钥。请选择创建新的密钥或导入已有密钥。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={generateKeyPair}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? '生成中...' : '创建密钥'}
            </button>
            <input
              type="file"
              accept="application/json"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) openImportModalWithFile(file);
                e.currentTarget.value = '';
              }}
              className="hidden"
              id="import-key-file-empty"
            />
            <button
              onClick={() => document.getElementById('import-key-file-empty')?.click()}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              导入密钥
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              公钥 (可公开分享)
            </label>
            <div className="bg-gray-50 p-3 rounded-lg border font-mono text-sm break-all">
              {keyData.publicKey}
            </div>
            <button
              onClick={() => copyToClipboard(keyData.publicKey)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              复制公钥
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DID Key (base58-btc)
            </label>
            <div className="bg-gray-50 p-3 rounded-lg border font-mono text-sm break-all">
              {getDidKey(keyData.publicKey)}
            </div>
            <button
              onClick={() => copyToClipboard(getDidKey(keyData.publicKey))}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              复制 DID Key
            </button>
          </div>

          <div className="text-sm text-gray-500">
            <p>创建时间: {new Date(keyData.createdAt).toLocaleString('zh-CN')}</p>
          </div>

          <div className="flex gap-3">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                删除密钥
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={deleteKey}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  取消
                </button>
              </div>
            )}
            <button
              onClick={openExportModal}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              导出密钥
            </button>
            <label className="inline-flex items-center">
              <span className="sr-only">导入密钥</span>
              <input
                type="file"
                accept="application/json"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) openImportModalWithFile(file);
                  e.currentTarget.value = '';
                }}
                className="hidden"
                id="import-key-file"
              />
              <button
                onClick={() => document.getElementById('import-key-file')?.click()}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                导入密钥
              </button>
            </label>
          </div>

          {showDeleteConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-2">⚠️ 警告</p>
              <p className="text-red-700 text-sm">
                删除密钥是不可逆的操作！删除后您将无法恢复此密钥，所有相关的数字签名都将失效。
              </p>
            </div>
          )}
          
        </div>
      )}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="text-lg font-semibold text-gray-800 mb-3">
              {passwordMode === 'export' ? '设置导出文件密码' : '输入导入文件密码'}
            </div>
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder={passwordMode === 'export' ? '至少 8 位' : '请输入密码'}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={cancelPasswordAction}
                disabled={isLoading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg border"
              >
                取消
              </button>
              <button
                onClick={confirmPasswordAction}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg"
              >
                确认
              </button>
            </div>
            {passwordMode === 'export' && (
              <div className="mt-2 text-xs text-gray-500">为确保安全，建议使用 8 位以上的强密码。</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
