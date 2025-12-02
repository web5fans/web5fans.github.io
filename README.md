# Web5 教程网站

一个交互式的 Web5 教程网站，专注于教育用户了解 Web5 的核心概念，特别是去中心化身份和加密技术。

## 🌟 功能特点

- **密钥管理**: 使用 secp256k1 算法创建和管理数字签名密钥
- **教程系统**: 结构化的 Web5 概念讲解和实践指导
- **交互式体验**: 用户可以直接在浏览器中生成和操作密钥
- **响应式设计**: 适配桌面端、平板端和移动端
- **本地存储**: 私钥安全存储在浏览器 localStorage 中

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:5173` 查看应用。

### 构建项目

```bash
npm run build
```

### 部署到 GitHub Pages

将 `dist/` 目录发布到 `gh-pages` 分支，或设置主分支为 Pages 源：

1. Settings → Pages → Source 选择 `Deploy from a branch`
2. Branch 选择 `gh-pages`，`/` 目录
3. 保存后几分钟即可在 `https://web5fans.github.io/` 访问

命令行发布（需已配置远程仓库且有推送权限）：

```bash
npm run build
npm run deploy
```

## 📁 项目结构

```
src/
├── components/          # React 组件
│   ├── KeyManager.tsx   # 密钥管理组件
│   └── TestComponent.tsx # 测试组件
├── pages/              # 页面组件
│   ├── Home.tsx        # 首页
│   └── Tutorial.tsx    # 教程页面
├── utils/              # 工具函数
│   └── storage.ts      # 本地存储工具
└── hooks/              # 自定义 Hooks
```

## 🔐 安全说明

- 私钥仅存储在浏览器本地，不会发送到任何服务器
- 提供明确的删除警告，防止用户意外丢失密钥
- 使用浏览器原生 Web Crypto API 进行密钥生成
- 支持密钥导出和公钥分享功能

## 🎨 设计特色

- **主色调**: 深蓝色渐变背景 (#1a365d → #3182ce)
- **按钮样式**: 圆角矩形，3D 悬浮效果
- **字体**: Inter 字体族，层次分明的排版
- **布局**: 卡片式布局，清晰的视觉层次
- **图标**: 简洁的线性图标配合 emoji 表情

## 📚 教程内容

### Web5 基础概念
- 什么是 Web5
- 去中心化身份 (DID)
- 数字签名与验证

### 密钥管理实践
- 生成 secp256k1 密钥对
- 安全存储密钥
- 使用密钥进行签名

### Web5 应用场景
- 去中心化认证
- 数据完整性验证
- 下一步学习建议

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS
- **路由**: React Router DOM
- **加密库**: Web Crypto API
- **部署**: GitHub Pages

## 📱 响应式设计

- **桌面端**: 默认设计，最大宽度 1200px
- **平板端**: 768px 断点
- **手机端**: 375px 断点
- **触摸优化**: 44px 最小点击区域

## 🔧 开发说明

### 密钥生成算法

使用 ECDSA 算法和 P-256 曲线（secp256k1 的浏览器实现）生成密钥对：

```typescript
const keyPair = await window.crypto.subtle.generateKey(
  {
    name: 'ECDSA',
    namedCurve: 'P-256',
  },
  true,
  ['sign', 'verify']
);
```

### 本地存储格式

```typescript
interface SigningKeyData {
  privateKey: string;  // Hex 格式私钥
  publicKey: string;   // Hex 格式公钥
  createdAt: string;   // ISO 时间戳
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 📄 许可证

MIT License

## 🙏 致谢

- Web5 社区提供的教育资源
- Tailwind CSS 提供的优秀样式框架
- Vite 提供的快速开发体验
