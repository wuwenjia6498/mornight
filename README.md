# AI儿童阅读教育文案生成工具

基于 Next.js 14+ (App Router) 开发的AI驱动儿童阅读教育文案生成工具，专注于为儿童阅读教育创作专业、优质的文案内容。

## 技术栈

- **框架**: Next.js 14+ with App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件库**: shadcn/ui
- **状态管理**: React Hooks
- **AI服务**: Google Gemini API
- **包管理**: npm/pnpm

## 已安装的依赖

### 核心依赖
- `date-fns` - 日期处理工具
- `lucide-react` - 图标库
- `jszip` - 文件打包下载

### UI组件
- `button` - 按钮组件
- `calendar` - 日历组件
- `card` - 卡片组件
- `scroll-area` - 滚动区域组件
- `separator` - 分隔符组件
- `sonner` - 通知组件 (替代toast)
- `tabs` - 标签页组件
- `label` - 标签组件

## 环境配置

1. 复制 `.env.local.example` 为 `.env.local`
2. 填入相应的API密钥和配置信息

```bash
cp .env.local.example .env.local
```

## 开发指南

### 启动开发服务器

```bash
npm run dev
# 或
pnpm dev
```

### 构建项目

```bash
npm run build
# 或
pnpm build
```

### 代码检查

```bash
npm run lint
# 或
pnpm lint
```

## 项目结构

```
src/
├── app/                 # App Router 页面
├── components/          # React 组件
│   └── ui/             # shadcn/ui 组件
├── lib/                # 工具库和配置
└── hooks/              # 自定义 Hooks
```

## 环境变量

参考 `.env.local.example` 文件配置以下环境变量：

- `GEMINI_API_KEY` - Google Gemini API 密钥
- `AIHUBMIX_API_URL` - AI Hub Mix API 地址（可选，默认使用官方地址）

## 开发说明

## 主要功能

### 🎯 文案生成功能
- **三种类型文案**：为每个日期生成情感共鸣型、认知提升型、实用指导型三种不同风格的文案
- **智能上下文**：结合季节、节气、节日等上下文信息，生成更贴合时节的内容
- **批量处理**：支持选择多个日期进行批量文案生成
- **实时预览**：可以在三种文案类型之间自由切换预览

### 📦 导出功能
- **批量导出**：支持将所有生成的文案内容打包为ZIP文件下载
- **结构化存储**：每个日期的内容单独存储在以日期命名的文件夹中
- **文本格式**：导出为易于阅读和编辑的文本文件

### 🎨 用户界面
- **现代化设计**：采用简约优雅的Apple风格设计
- **响应式布局**：适配不同屏幕尺寸
- **直观操作**：清晰的工作流程和用户引导

## 使用指南

1. **选择日期**：在左侧日历中选择需要生成文案的日期
2. **生成内容**：点击生成按钮，AI将为选定日期创作三种类型的文案
3. **预览文案**：在主内容区查看生成的文案，可切换不同类型
4. **导出下载**：使用批量导出功能下载所有内容
