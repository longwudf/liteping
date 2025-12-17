# LitePing

[中文文档](./README_zh-CN.md)

<div align="center">

![LitePing](./apps/web/static/favicon.svg)

**Lightweight, Serverless Status Page & Monitoring Platform**

Built with [SvelteKit](https://kit.svelte.dev/), [Cloudflare Workers](https://workers.cloudflare.com/), and [D1 Database](https://developers.cloudflare.com/d1/).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/liteping)

</div>

## 🚀 Features

- **Serverless Architecture**: Runs entirely on Cloudflare's Edge network (Workers + Pages + D1).
- **Multi-Region Monitoring**: Automatically detects worker location to ping from different global regions.
- **Real-time Status Page**: Beautiful, responsive status page built with Svelte 5.
- **Incident Management**: Automatic incident creation and resolution tracking.
- **Notifications**: Integrated alerts for Discord, Telegram, Slack, and Webhooks.
- **Sparkline Charts**: Visual history of latency and uptime for every monitor.
- **Maintenance Windows**: Schedule maintenance to suppress alerts during planned downtime.

## 🛠 Tech Stack

- **Frontend**: SvelteKit (Svelte 5), Tailwind CSS
- **Backend**: Cloudflare Workers (Hono framework)
- **Database**: Cloudflare D1 (SQLite), Drizzle ORM
- **Package Manager**: pnpm (Monorepo workspace)

## 📂 Project Structure

LitePing is a monorepo organized as follows:

- `apps/web`: The SvelteKit frontend application (Status Page & Admin Dashboard).
- `apps/worker`: The Cloudflare Worker responsible for scheduled monitoring (Cron Triggers).
- `packages/db`: Shared database schema and Drizzle ORM configuration.

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [pnpm](https://pnpm.io/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/liteping.git
   cd liteping
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup Database (Local)**
   Initialize the D1 database for local development:
   ```bash
   cd packages/db
   pnpm generate
   # Apply migrations to local D1
   # Note: Replace the filename below with your actual generated SQL file
   npx wrangler d1 execute liteping-db --local --file=./drizzle/0000_xxxx.sql
   # (Or use the migrate command if configured)
   ```

### Local Development

1. **Start the Web App**
   ```bash
   cd apps/web
   pnpm dev
   ```
   Access the UI at `http://localhost:5173`.

2. **Start the Worker**
   In a separate terminal:
   ```bash
   cd apps/worker
   npx wrangler dev
   ```
   The worker runs on a schedule. You can manually trigger it via the `l` key in the Wrangler dev console to test pings.

## 📦 Deployment

### 1. Database Setup
Create a D1 database on Cloudflare:
```bash
npx wrangler d1 create liteping-db
```
Update `wrangler.toml` in `apps/web` and `apps/worker` with your new `database_id`.

Apply migrations to production:
```bash
cd packages/db
pnpm migrate
```

### 2. Deploy Worker
```bash
cd apps/worker
pnpm deploy
```

### 3. Deploy Web App
```bash
cd apps/web
pnpm build
npx wrangler pages deploy .svelte-kit/cloudflare
```

## 📝 Usage

### Admin Dashboard
Access the admin dashboard at `/admin` (e.g., `https://your-site.pages.dev/admin`).
- **First Login**: You will be prompted to set an admin password if one hasn't been configured via environment variables.
- **Features**: Add monitors, configure notifications, view detailed stats, and manage maintenance windows.

## 🔧 Configuration

Environment variables can be set in the Cloudflare Dashboard or `wrangler.toml`.

| Variable | Description |
|----------|-------------|
| `NOTIFY_LANGUAGE` | Language for notifications (e.g., `zh-CN`, `en-US`) |
| `DISCORD_WEBHOOK_URL` | Optional webhook URL for Discord alerts |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
