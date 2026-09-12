# 吵架外挂

把对方的话丢进来，AI 帮你分析战局，并生成「最稳 / 带刺 / 高火力」三档回复。

## 功能

- 关系选择：对象、前任、朋友、同事、领导、亲戚、网友
- 风格选择：不吃亏、高情商、阴阳一下、贴吧老哥、强硬反击、结束争论
- 火力 1—5 档
- DeepSeek 实时生成
- 连续对话记忆（最近 8 回合）
- 预测对方下一句
- 爽感与翻车风险提示

## Vercel 环境变量

必须配置：

- `DEEPSEEK_API_KEY`：你的 DeepSeek API Key

可选：

- `DEEPSEEK_MODEL`：默认 `deepseek-v4-flash`

API Key 只放在 Vercel 环境变量中，不要写进 GitHub 仓库。

## 部署

这是一个原生 HTML/CSS/JS + Vercel Serverless Function 项目，不需要构建命令。

目录结构：

```text
chaowai/
├─ index.html
├─ style.css
├─ app.js
├─ package.json
├─ vercel.json
└─ api/
   └─ reply.js
```
