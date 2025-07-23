# 前端内容展示功能

## 功能概述

本次开发完成了前端的内容展示部分，包括中间栏的内容列表和右侧栏的详情展示功能。

## 主要功能

### 1. 中间栏 `MainContent.tsx`

**核心功能：**
- ✅ 接收API返回的内容数组作为props
- ✅ 使用 `shadcn/ui` 的 `ScrollArea` 和 `Card` 组件
- ✅ 以列表形式展示每一天的生成结果
- ✅ 显示日期和情感共鸣型文案的预览
- ✅ 实现点击卡片选中功能
- ✅ 为选中的卡片添加明显的视觉高亮（蓝色边框和阴影）

**交互特性：**
- 卡片悬停效果
- 选中状态的视觉反馈
- 文案内容截断显示（超过3行显示省略号）
- 图片数量提示
- 响应式滚动区域

### 2. 右侧栏 `RightSidebar.tsx`

**核心功能：**
- ✅ 接收当前选中的单个内容对象作为prop
- ✅ 未选中时显示提示信息
- ✅ 使用 `Tabs` 组件展示三种文案类型：
  - 情感共鸣型（粉色主题）
  - 认知提升型（蓝色主题）
  - 实用指导型（绿色主题）
- ✅ 网格布局展示图片配图选项
- ✅ 图片选择功能（点击选中，视觉反馈）
- ✅ 确认/取消选择按钮

**交互特性：**
- 标签页切换
- 图片选择状态管理
- 图片加载错误处理
- 搜索关键词标签展示
- 响应式滚动区域

### 3. 状态管理更新

**在 `page.tsx` 中新增：**
- `selectedContent` 状态管理
- `handleContentSelect` 回调函数
- 自动选中逻辑（单个内容时）
- 测试数据加载功能

## 技术实现

### 组件架构
```
page.tsx (状态管理)
├── MainContent.tsx (内容列表)
│   ├── ScrollArea (滚动区域)
│   └── Card[] (内容卡片)
└── RightSidebar.tsx (详情展示)
    ├── Tabs (文案分类)
    └── ImageGrid (图片选择)
```

### 主要依赖
- `@radix-ui/react-scroll-area` - 滚动区域
- `@radix-ui/react-tabs` - 标签页组件
- `date-fns` - 日期格式化
- `lucide-react` - 图标库

### 样式系统
- Tailwind CSS 响应式设计
- 自定义 line-clamp 工具类
- 统一的颜色主题系统

## 使用方法

### 1. 开发环境运行
```bash
npm run dev
```

### 2. 测试功能
1. 访问 http://localhost:3000
2. 点击页面顶部的"🧪 加载测试数据"按钮
3. 在中间栏点击任意卡片查看详情
4. 在右侧栏切换不同的文案标签页
5. 点击图片进行选择和确认

### 3. 集成真实API
移除测试按钮和测试数据导入，确保API返回的数据格式符合 `ApiResponse` 接口定义。

## 接口定义

```typescript
interface ApiResponse {
  date: string;
  context: {
    season: string;
    solarTerm?: string;
    festival?: string;
    month: number;
    day: number;
    weekday: string;
  };
  content: {
    emotional_copy: string;
    cognitive_copy: string;
    practical_copy: string;
    keywords_for_image_search: string[];
  };
  image_options: {
    id: string;
    url: string;
    title?: string;
    description?: string;
  }[];
}
```

## 未来优化方向

1. **图片预加载** - 提升用户体验
2. **虚拟滚动** - 处理大量数据时的性能优化
3. **键盘导航** - 提升可访问性
4. **动画效果** - 增强交互体验
5. **导出功能** - 允许用户保存选中的内容和图片 