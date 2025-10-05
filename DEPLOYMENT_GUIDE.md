# 部署与缓存清理指南

## 部署后必须执行的步骤

### 1. 清除浏览器缓存

部署新版本后，如果发现字体大小或图标没有更新，请按照以下步骤清除缓存：

#### Chrome / Edge
1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择「清空缓存并硬性重新加载」
4. 或者按快捷键：`Ctrl + Shift + R`（Windows）/ `Cmd + Shift + R`（Mac）

#### Firefox
1. 按住 `Shift` 键，点击刷新按钮
2. 或者按快捷键：`Ctrl + F5`（Windows）/ `Cmd + Shift + R`（Mac）

#### Safari
1. 打开「开发」菜单（如未显示，在「偏好设置」→「高级」中启用）
2. 选择「清空缓存」
3. 或者按快捷键：`Option + Cmd + E`，然后刷新页面

### 2. 部署平台缓存清理

#### Vercel
如果使用 Vercel 部署：
```bash
# 在本地终端运行
vercel --prod --force
```
或在 Vercel Dashboard 中：
1. 进入项目设置
2. 找到「Deployments」
3. 点击最新部署右侧的「...」菜单
4. 选择「Redeploy」→「Use existing Build Cache: OFF」

#### Netlify
如果使用 Netlify：
1. 进入站点设置
2. 点击「Deploys」→「Trigger deploy」
3. 选择「Clear cache and deploy site」

### 3. 验证部署成功

打开浏览器开发者工具的网络标签：
1. 刷新页面
2. 检查 `globals.css` 文件：
   - 查找 `font-size: 16px !important`
   - 确认文件加载状态为 `200`（不是 `304 Not Modified`）
3. 检查 `favicon.ico` 是否正确加载

### 4. 字体大小问题排查

如果清除缓存后字体仍然显示不一致：

#### 检查用户浏览器设置
1. Chrome：设置 → 外观 → 字体大小（确保为「中」）
2. Firefox：设置 → 常规 → 字体和颜色 → 最小字号（确保为「无」）
3. Safari：偏好设置 → 网站 → 页面缩放（确保为 100%）

#### 检查操作系统缩放
- **Windows**：设置 → 系统 → 显示 → 缩放与布局（建议 100%）
- **macOS**：系统偏好设置 → 显示器 → 缩放（选择「默认」）

#### 使用开发者工具检查
```javascript
// 在浏览器控制台运行
console.log('HTML font-size:', getComputedStyle(document.documentElement).fontSize);
console.log('Body font-size:', getComputedStyle(document.body).fontSize);
// 应该都显示 "16px"
```

## 最新更新内容

### 字体优化（已完成）
- ✅ 强制设置 `html` 和 `body` 的字体大小为 16px
- ✅ 添加 `text-size-adjust: 100%` 防止移动设备自动缩放
- ✅ 配置 Google Fonts 字体预加载和优化显示策略
- ✅ 添加完整的字体回退栈

### 图标配置（已完成）
- ✅ 在 metadata 中明确配置 favicon 路径
- ✅ 添加 Apple 设备图标支持

## 技术说明

### 为什么使用 `!important`？
在生产环境中，某些第三方脚本、浏览器插件或用户自定义样式可能覆盖我们的字体设置。使用 `!important` 确保字体大小保持一致，这是合理的设计决策。

### 字体大小计算
- 基础：16px（1rem）
- Tailwind 的 `text-base` = 1rem = 16px
- Tailwind 的 `text-lg` = 1.125rem = 18px
- Tailwind 的 `text-xl` = 1.25rem = 20px

### 移动端适配
`text-size-adjust: 100%` 防止 iOS Safari 在横屏时自动放大文字，确保移动端和桌面端显示一致。

## 问题反馈

如果问题仍然存在，请提供以下信息：
1. 浏览器类型和版本
2. 操作系统和版本
3. 浏览器控制台的字体大小检查结果
4. 具体哪些文字显示异常（截图）
