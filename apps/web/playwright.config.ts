import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceConfigDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.wrangler-config');

export default defineConfig({
    webServer: {
        command: 'corepack pnpm run preview --host 127.0.0.1',
        env: {
            XDG_CONFIG_HOME: workspaceConfigDir
        },
        port: 4173,
        reuseExistingServer: !process.env.CI
    },
    testDir: 'tests',
    testMatch: /(.+\.)?(test|spec)\.[jt]s/,
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        },
    ]
});
