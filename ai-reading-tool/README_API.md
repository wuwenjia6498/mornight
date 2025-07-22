# AI 阅读教育文案生成 + 图片匹配 API 使用说明

## 🚀 API Route 功能说明

### 路径
`POST /api/generate`

### 功能
根据选定的日期，生成专业的儿童阅读教育文案，并智能匹配相关插图。

## 📝 环境配置

### 1. 创建环境变量文件
复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

### 2. 配置 API 密钥
在 `.env.local` 文件中添加相关 API 密钥：

```env
# Gemini API 配置
GEMINI_API_KEY=你的_gemini_api_密钥

# Pinecone 配置（用于图片向量搜索）
PINECONE_API_KEY=你的_pinecone_api_密钥
PINECONE_INDEX_NAME=illustrations

# Supabase 配置（用于图片元数据存储）
SUPABASE_URL=你的_supabase_url
SUPABASE_ANON_KEY=你的_supabase_anon_key
```

### 3. 获取各服务的 API 密钥

#### Gemini API
1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 创建新项目或选择现有项目
3. 生成 API 密钥

#### Pinecone (向量数据库)
1. 访问 [Pinecone](https://www.pinecone.io/)
2. 注册账号并创建项目
3. 创建一个名为 `illustrations` 的索引
4. 获取 API 密钥

#### Supabase (数据库)
1. 访问 [Supabase](https://supabase.com/)
2. 创建新项目
3. 在项目设置中获取 URL 和 anon key
4. 创建 `illustrations` 表

## 🔧 API 接口详情

### 请求格式
```json
{
  "dates": ["2024-01-15", "2024-01-16", "2024-01-17"]
}
```

### 响应格式（更新）
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "context": {
        "season": "冬季",
        "solarTerm": "小寒",
        "festival": null,
        "month": 1,
        "day": 15,
        "weekday": "星期一"
      },
      "content": {
        "emotional_copy": "情感共鸣型文案内容...",
        "cognitive_copy": "认知提升型文案内容...",
        "practical_copy": "实用指导型文案内容...",
        "keywords_for_image_search": ["亲子阅读", "冬季", "温馨", "教育"]
      },
      "image_options": [
        {
          "id": "img_123",
          "url": "https://example.com/image1.jpg",
          "title": "温馨亲子阅读",
          "description": "家长和孩子一起阅读的温馨场景"
        },
        {
          "id": "img_456", 
          "url": "https://example.com/image2.jpg",
          "title": "冬日阅读时光",
          "description": "冬季室内阅读的美好时光"
        }
      ]
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎯 新增功能：智能图片匹配

### 工作流程

1. **文案生成**: 使用 Gemini API 生成三种类型的文案和关键词
2. **描述构建**: 基于关键词和日期上下文构建图片搜索描述
3. **文本编码**: 将描述转换为向量（使用模拟的 CLIP 模型）
4. **相似性搜索**: 在 Pinecone 中查找最相似的图片
5. **元数据获取**: 从 Supabase 获取图片的详细信息
6. **结果整合**: 将文案和图片选项组合返回

### 图片搜索特性

- **智能匹配**: 基于季节、节日、情感等多维度匹配
- **多样选择**: 每个日期返回 3-5 张相关图片
- **回退机制**: 搜索失败时提供默认的高质量图片
- **元数据丰富**: 包含图片标题、描述等信息

## 🛠️ 数据库设计

### Supabase `illustrations` 表结构
```sql
CREATE TABLE illustrations (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Pinecone 索引配置
- **维度**: 1536 (兼容 text-embedding-ada-002)
- **距离度量**: cosine
- **索引名称**: illustrations

## 🔍 使用示例

### 前端调用示例
```javascript
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    dates: ['2024-06-01', '2024-12-25']
  }),
});

const result = await response.json();

// 访问生成的文案
console.log(result.data[0].content.emotional_copy);

// 访问匹配的图片
console.log(result.data[0].image_options);
```

## 🎨 前端展示特性

### 图片展示组件
- **网格布局**: 2-3 列响应式网格
- **悬停效果**: 鼠标悬停显示操作图标
- **错误处理**: 图片加载失败时显示占位符
- **懒加载**: 支持大量图片的性能优化

### 交互功能
- **图片预览**: 点击图片查看大图
- **批量选择**: 支持选择多张图片
- **下载功能**: 一键下载选中的图片

## ⚠️ 注意事项

1. **API 密钥安全**: 确保所有 API 密钥都配置在服务器端环境变量中
2. **向量维度一致性**: 确保 Pinecone 索引和文本编码的维度匹配
3. **图片存储**: 建议使用 CDN 加速图片加载
4. **成本控制**: 
   - Pinecone 查询有使用限制
   - Gemini API 调用需要计费
   - Supabase 有存储和带宽限制

## 🔧 开发模式

### 模拟模式
当未配置 Pinecone 或 Supabase 时，系统会：
- 使用模拟的文本编码函数
- 返回默认的高质量 Unsplash 图片
- 保持 API 接口的一致性

### 生产模式
配置所有服务后，系统会：
- 调用真实的文本编码模型
- 在向量数据库中搜索相似图片
- 返回个性化的图片推荐

## 🚀 性能优化

1. **并发处理**: 文案生成和图片搜索可以并行执行
2. **缓存策略**: 对热门搜索关键词进行结果缓存
3. **批量操作**: 支持批量处理多个日期
4. **CDN 加速**: 图片通过 CDN 分发提高加载速度

## 📈 扩展功能

### 计划中的功能
- **图片风格过滤**: 支持按风格筛选图片
- **用户偏好学习**: 记住用户的图片选择偏好
- **自定义上传**: 允许用户上传自己的图片
- **AI 图片生成**: 集成 DALL-E 等图片生成模型 