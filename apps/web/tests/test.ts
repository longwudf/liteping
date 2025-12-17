import { expect, test } from '@playwright/test';

test('home page has expected title and login button', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LitePing/);

    // Check for login button or link
    const loginLink = page.getByRole('link', { name: /Login|登录/i });
    await expect(loginLink).toBeVisible();
});

test('can navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Login|登录/i }).click();
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole('heading', { name: /Login|登录/i })).toBeVisible();
});
