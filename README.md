# AI儿童阅读教育内容生成工具

基于 Next.js 14+ (App Router) 开发的AI驱动儿童阅读教育内容生成平台。

## 技术栈

- **框架**: Next.js 14+ with App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件库**: shadcn/ui
- **状态管理**: React Hooks
- **AI服务**: Google Gemini API
- **向量数据库**: Pinecone
- **后端数据库**: Supabase
- **包管理**: npm/pnpm

## 已安装的依赖

### 核心依赖
- `@google/generative-ai` - Google Gemini API集成
- `@pinecone-database/pinecone` - Pinecone向量数据库
- `@supabase/supabase-js` - Supabase数据库客户端
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

- `GOOGLE_GEMINI_API_KEY` - Google Gemini API 密钥
- `PINECONE_API_KEY` - Pinecone API 密钥
- `PINECONE_INDEX_NAME` - Pinecone 索引名称
- `SUPABASE_URL` - Supabase 项目 URL
- `SUPABASE_ANON_KEY` - Supabase 公开匿名 Key

## 开发说明

项目已完成基础配置，包括：
- ✅ Next.js 14+ 项目初始化
- ✅ TypeScript 配置
- ✅ Tailwind CSS 配置
- ✅ ESLint 配置
- ✅ shadcn/ui 组件库集成
- ✅ 核心依赖包安装
- ✅ 环境变量模板创建

可以开始开发具体的功能模块了！
