# Changelog

All notable changes to LitePing are documented in this file.

## [1.1.0] - 2026-06-09

### Security

- Added signed admin sessions and consistent admin authorization checks.
- Added CSRF protection to admin mutations and order-saving requests.
- Protected `/api/backup` behind admin authentication and disabled response caching.
- Escaped badge SVG output to prevent malformed XML or injected badge text.

### Fixed

- Validated monitor URLs, HTTP methods, webhook URLs, notifier types, maintenance windows, and retention days before writing or using them.
- Prevented invalid monitor URLs or methods from reaching Worker fetch calls.
- Fixed hourly statistics writes by using the monitor/timestamp conflict key.
- Removed the unused global Discord webhook binding and routed notification configuration through the database.
- Checked notification webhook responses so failed deliveries are reported instead of silently ignored.
- Added cascade cleanup for monitor-related rows and a migration for existing D1 databases.

### Changed

- Improved admin UI form safety, destructive action confirmation, announcement editing, and badge copy behavior.
- Clarified login messaging when `ADMIN_PASSWORD` is not configured.
- Standardized pnpm/Corepack scripts and removed stale package-lock files from workspace packages.
- Added Worker TypeScript checking and aligned Playwright/Vite settings for local verification.

### Migration Notes

- Apply `packages/db/drizzle/0008_clean_monitor_relations.sql` to production D1 before or during deployment.
- Set `ADMIN_PASSWORD` in the web app environment before enabling admin access.

### Verified

- `corepack pnpm check`
- `corepack pnpm --filter worker test`
- `corepack pnpm build`
- `apps/web` Playwright tests with local Chrome
