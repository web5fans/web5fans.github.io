# Web5 DID 工具箱

一个交互式的 Web5 DID 工具网站，用户可以对自己的 DID 进行管理和操作。

## 🌟 功能特点

- **密钥管理**: 使用 secp256k1 算法创建和管理数字签名密钥对
- **DID 管理**: 更新和删除 DID 单元格
- **交互式体验**: 用户可以直接在浏览器中生成和操作密钥对
- **响应式设计**: 适配桌面端、平板端和移动端
- **本地存储**: 本网站无后端，私钥存储在浏览器 localStorage 中

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
├── App.tsx                  # 应用入口组件
├── main.tsx                 # 前端入口、挂载根节点
├── vite-env.d.ts            # Vite 类型声明
├── components/              # 业务组件
│   ├── WalletManager.tsx    # 钱包与 DID 管理
│   ├── KeyManager.tsx       # 密钥管理器
│   └── Empty.tsx            # 空状态组件
├── provider/                # 上下文提供者
│   └── WalletProvider.tsx   # 钱包上下文（查询/更新/销毁 DID Cells）
├── pages/                   # 页面
│   └── Home.tsx             # 首页
├── utils/                   # 工具库
│   ├── storage.ts           # 本地存储（SigningKeyData）
│   ├── didMolecule.ts       # DID Molecule 编解码
│   ├── didKey.ts            # DID Key 计算（did:key）
│   ├── crypto.ts            # AES-GCM 加密与 PBKDF2 派生
│   └── explorer.ts          # 区块链浏览器链接构建
├── hooks/                   # 自定义 Hooks
│   └── useTheme.ts          # 主题 Hook
└── lib/                     # 通用库
    └── utils.ts             # 通用工具函数
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

## 🔧 工具介绍

### 密钥管理器
- 生成 secp256k1 密钥对
- 浏览器local storage存储签名密钥对
- 展示已生成的密钥对信息
- 导出密钥对并加密存储
- 导入之前导出的密钥对

### DID 管理器
- 连接/断开 CKB 钱包
- 展示已连接的 CKB 钱包地址和余额
- 展示该地址下已存在的 DID cells
- 针对每个 DID cell 展示其 DID、DID Metadata等信息
- 针对每个 DID cell 提供销毁，更新和导出登录凭证三个操作
- 销毁操作用于销毁对应的 DID cell，该操作是不可逆的，用户一定要仔细确认再操作
- 更新操作用于更新 DID Metadata 中的 DID Key。新的 DID Key 使用前面密钥管理器生成的密钥对。
- 导出登录凭证操作用于导出 DID cell 中的登录凭证，用于后续登录 Web5 应用。

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

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 📄 许可证

MIT License

## 🙏 致谢

- Web5 社区提供的资源和支持
- Tailwind CSS 提供的优秀样式框架
- Vite 提供的快速开发体验
