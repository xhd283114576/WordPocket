# WordPocket

一个轻量、开源、隐私友好的英文单词记录应用。支持快速记词、随机复习，并通过安全的服务端 AI 接口自动生成英文例句、中文翻译和用法提示。

## 功能

- 记录英文单词、中文释义、例句和标签
- AI 自动生成自然例句、翻译与使用提示
- 搜索并按“学习中 / 已掌握”筛选
- 英文朗读与随机复习
- JSON 数据导入、导出
- 响应式设计，适配手机和桌面
- 词库保存在用户浏览器本地
- AI API Key 仅存在服务端环境变量中

## AI 服务配置

后端兼容提供 OpenAI Chat Completions 接口的服务商，例如 DeepSeek、通义千问、OpenAI 和硅基流动。

访客可以通过网站右上角的“AI 设置”选择服务商、模型并填写自己的 API Key。个人密钥只保存在浏览器 `sessionStorage`，关闭标签页后自动清除；请求经同源后端转发到所选服务商，后端不会持久化密钥。

站点所有者也可以配置一个默认共享密钥，让未填写个人密钥的访客直接使用：

复制 `.env.example` 为 `.env.local`，然后配置：

```bash
AI_API_KEY=your-server-side-api-key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
```

不要把 `.env.local` 或真实 API Key 提交到 Git 仓库。公开部署时，请在托管平台的 Secret / Environment Variables 设置中填写相同变量。

## 本地开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 安全设计

- 浏览器只访问同源 `/api/generate-example`
- 共享 API Key 不进入前端代码、浏览器存储或 GitHub 仓库
- 访客自行填写的密钥仅保存在当前浏览器会话中，不会写入词库或导出文件
- 单词和释义长度受限，并按固定 JSON 结构发送给模型
- 服务端设置超时、输出长度限制和基础频率限制
- 上游错误不会把密钥或完整响应暴露给访客

生产环境建议同时在 CDN 或网关层配置更严格的速率限制和每日预算上限。

## 参与贡献

欢迎提交 Issue 或 Pull Request。请确认手机和桌面布局均可正常使用，并且不要在 Issue、PR 或日志中粘贴 API Key。

## License

[MIT](LICENSE)
