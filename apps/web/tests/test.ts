import { expect, test } from '@playwright/test';

test('home page has expected title and admin link', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LitePing/);

    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
});

test('can navigate to admin login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole('heading', { name: /LitePing_/i })).toBeVisible();
});
