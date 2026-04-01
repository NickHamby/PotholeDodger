import { test, expect } from '@playwright/test';

test.describe('Page load', () => {
  test('heading contains "Pothole" and inputs are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Pothole');
    await expect(page.locator('#origin')).toBeVisible();
    await expect(page.locator('#destination')).toBeVisible();
    await expect(page.locator('#goBtn')).toBeVisible();
  });
});

test.describe('Autocomplete', () => {
  test('typing into origin shows the dropdown', async ({ page }) => {
    await page.goto('/');
    await page.fill('#origin', 'Broad St');
    // The dropdown becomes visible once Nominatim suggestions arrive
    await expect(page.locator('#originDropdown')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Routing smoke test', () => {
  test('fills Richmond VA addresses, clicks go, and shows stats with a Google Maps link', async ({ page }) => {
    await page.goto('/');

    // Fill origin and destination without triggering autocomplete selection
    await page.fill('#origin', '600 E Broad St, Richmond, VA');
    await page.fill('#destination', '200 S Belvidere St, Richmond, VA');

    // Click the go button
    await page.click('#goBtn');

    // Wait for the preview panel to appear (may take several seconds for OSRM + geocoding)
    await expect(page.locator('#previewPanel')).toBeVisible({ timeout: 30000 });

    // directStats and dodgeStats should contain real text (not just the placeholder dash)
    const directStats = (await page.locator('#directStats').textContent()) ?? '';
    expect(directStats).not.toBe('—');
    expect(directStats.trim().length).toBeGreaterThan(0);

    const dodgeStats = (await page.locator('#dodgeStats').textContent()) ?? '';
    expect(dodgeStats).not.toBe('—');

    // dodgeBtn href should point to Google Maps
    const dodgeHref = await page.locator('#dodgeBtn').getAttribute('href');
    expect(dodgeHref).toMatch(/^https:\/\/www\.google\.com\/maps/);
  });
});
