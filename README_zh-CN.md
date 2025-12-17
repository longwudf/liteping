# LitePing

<div align="center">

![LitePing](./apps/web/static/favicon.svg)

**轻量级、无服务器 (Serverless) 的状态页与监控平台**

基于 [SvelteKit](https://kit.svelte.dev/)、[Cloudflare Workers](https://workers.cloudflare.com/) 和 [D1 Database](https://developers.cloudflare.com/d1/) 构建。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/liteping)

</div>

## 🚀 核心特性

- **纯 Serverless 架构**: 完全运行在 Cloudflare 边缘网络上 (Workers + Pages + D1)，零服务器维护成本。
- **多区域监控**: 自动利用 Worker 的边缘节点特性，实现全球多地点的延迟检测。
- **实时状态页**: 基于 Svelte 5 构建的现代化、响应式状态展示页面。
- **事件管理**: 自动创建故障事件，并追踪从发现到解决的全过程。
- **多渠道通知**: 支持 Discord, Telegram, Slack 以及自定义 Webhooks 告警。
- **迷你图表 (Sparklines)**: 可视化展示每个监控项的历史延迟和在线率。
- **维护窗口**: 支持设置计划维护时间，维护期间自动静默告警。

## 🛠 技术栈

- **前端**: SvelteKit (Svelte 5), Tailwind CSS
- **后端**: Cloudflare Workers (Hono 框架)
- **数据库**: Cloudflare D1 (SQLite), Drizzle ORM
- **包管理**: pnpm (Monorepo 工作区模式)

## 📂 项目结构

LitePing 采用 Monorepo 结构进行管理：

- `apps/web`: SvelteKit 前端应用（包含公开状态页 & 管理后台）。
- `apps/worker`: Cloudflare Worker 后端，负责定时监控任务 (Cron Triggers)。
- `packages/db`: 共享的数据库 Schema 定义和 Drizzle ORM 配置。

## ⚡ 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (推荐 v20+)
- [pnpm](https://pnpm.io/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/liteping.git
   cd liteping
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **初始化本地数据库**
   为本地开发环境初始化 D1 数据库：
   ```bash
   cd packages/db
   pnpm generate
   # 应用迁移文件到本地 D1 数据库
   # 注意：请将下面的文件名替换为你实际生成的 SQL 文件名
   npx wrangler d1 execute liteping-db --local --file=./drizzle/0000_xxxx.sql
   ```

### 本地开发

1. **启动 Web 应用**
   ```bash
   cd apps/web
   pnpm dev
   ```
   浏览器访问 `http://localhost:5173` 查看页面。

2. **启动 Worker (监控服务)**
   新建一个终端窗口：
   ```bash
   cd apps/worker
   npx wrangler dev
   ```
   Worker 会按计划任务运行。在 Wrangler 控制台中按 `l` 键可手动触发 Cron 任务以测试 Ping 功能。

## 📦 部署指南

### 1. 数据库设置
在 Cloudflare 上创建一个生产环境的 D1 数据库：
```bash
npx wrangler d1 create liteping-db
```
将控制台输出的 `database_id` 更新到 `apps/web` 和 `apps/worker` 目录下的 `wrangler.toml` 文件中。

应用迁移到生产环境数据库：
```bash
cd packages/db
pnpm migrate
```

### 2. 部署 Worker
```bash
cd apps/worker
pnpm deploy
```

### 3. 部署 Web 应用 (Pages)
```bash
cd apps/web
pnpm build
npx wrangler pages deploy .svelte-kit/cloudflare
```

## 🔧 配置说明

环境变量可以通过 Cloudflare 仪表盘设置，也可以在 `wrangler.toml` 中配置。

| 变量名 | 说明 |
|--------|------|
| `NOTIFY_LANGUAGE` | 通知语言 (例如: `zh-CN`, `en-US`) |
| `DISCORD_WEBHOOK_URL` | (可选) Discord 告警机器人的 Webhook 地址 |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
