<p align="center">
  <img src="./public/jizuo-cover.svg" alt="Jizuo 迹作" width="100%" />
</p>

<h1 align="center">Jizuo · 迹作</h1>

<p align="center"><strong>把一次 AI 实操轨迹，变成有证据、可发布的自媒体作品。</strong></p>

<p align="center">
  <a href="https://jizuo.vercel.app">在线体验</a> ·
  <a href="./README.md">English</a> ·
  <a href="./docs/PRODUCT.md">产品说明</a>
</p>

AI 协作中最值得讲的，往往不是最后一句答案，而是“为什么改变方向”。迹作会读取 Codex 会话，提取目标、尝试、失败、取舍与结果，生成可编辑的决策轨迹和 8 页 3:4 内容故事板。

## 核心特性

- **不只总结答案**：保留失败、查证和转折，还原真实决策过程。
- **每个结论都有出处**：节点与卡片绑定原始 Prompt、工具调用和结果。
- **直接操纵内容**：点击或拖入节点即可绑定证据，标题与正文可就地修改。
- **从日志直到发布**：单页导出 PNG，或一键打包 8 页 ZIP。
- **安全且透明**：浏览器先解析和脱敏；DeepSeek 不可用时明确标注本地基础模式。

## 快速开始

```bash
git clone https://github.com/xiaoqi302/jizuo.git
cd jizuo
npm install
cp .env.example .env.local
npm run dev
```

迹作支持两条服务端路径：使用 DeepSeek Key 直连，或在账号已启用 AI 额度时，通过 Vercel OIDC 与 AI Gateway 调用 DeepSeek V4 Flash。本地直连时，在 `.env.local` 填入：

```bash
DEEPSEEK_API_KEY=your_key_here
```

本地也可改用 `AI_GATEWAY_API_KEY` 连接 Vercel AI Gateway。

打开 `http://localhost:3000`。没有 Key 也可直接点击“用示例轨迹体验”跑通完整流程。

## AI 原生设计

迹作不是把一段长日志丢给模型“总结一下”。它先将会话解析为结构化事件，再让 DeepSeek 输出有严格 Schema 的“决策节点 + 8 页卡片”。所有证据 ID 必须来自输入事件；无效引用会被拒绝并修复，而不是将模型幻觉直接呈现给用户。

## 隐私边界

日志先在浏览器中处理。常见 API Key、Authorization Header、Token、邮箱、敏感 URL 参数和本机用户名会在分析前脱敏。MVP 不含数据库，上次工作台只保存在当前浏览器。请勿导入未获授权的会话，发布前请人工复核。

## 验证状态

- Codex JSONL / JSON / Markdown / 普通对话文本导入
- DeepSeek 结构化故事分析
- 决策轨迹与证据绑定
- 8 页 3:4 故事板编辑
- 1350×1800 PNG 与 8 页 ZIP 真实导出
- 桌面端与移动端浏览器验收

为 2026 迅雷校园 AI 创造营打造。[MIT License](./LICENSE)。
