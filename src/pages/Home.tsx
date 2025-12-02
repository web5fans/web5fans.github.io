import React from 'react';
import { KeyManager } from '../components/KeyManager';
import { SigningKeyData } from '../utils/storage';

export const Home: React.FC = () => {
  const handleKeyChange = (keyPair: SigningKeyData | null) => {
    console.log('Key changed:', keyPair);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <div className="text-white font-bold text-xl flex items-center">
              <span className="mr-2">🌐</span>
              Web5 Fans
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            探索 Web5 的世界
          </h1>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            了解去中心化身份和数字签名的核心概念，掌握 Web5 技术的实际应用
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => document.getElementById('key-manager')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-transparent border-2 border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white hover:text-blue-800 transition-all duration-200"
            >
              密钥管理
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Web5 要点
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-4xl mb-4">🔑</div>
              <h3 className="text-xl font-semibold text-white mb-3">数字签名</h3>
              <p className="text-blue-100">
                使用 secp256k1 算法创建和管理数字签名密钥，确保数据的完整性和身份验证。
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-4xl mb-4">🆔</div>
              <h3 className="text-xl font-semibold text-white mb-3">去中心化身份</h3>
              <p className="text-blue-100">
                在不依赖中心化机构的情况下管理数字身份。
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-white mb-3">安全存储</h3>
              <p className="text-blue-100">
                在浏览器环境中安全地生成、存储和管理加密密钥。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Manager Section */}
      <section id="key-manager" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              密钥管理器
            </h2>
            <p className="text-blue-100 text-lg">
              创建您的第一个 Web5 数字签名密钥
            </p>
          </div>
          <KeyManager onKeyChange={handleKeyChange} />
          
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-blue-200">
            © 2025 Web5 Fans - 探索 Web5 的世界
          </p>
        </div>
      </footer>
    </div>
  );
};
