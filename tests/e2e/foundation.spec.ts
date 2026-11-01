import { expect, test } from '@playwright/test';

test('navigation and atmosphere survive a reload on desktop and mobile', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A little room for reading.' })).toBeVisible();
  await page.getByRole('link', { name: 'Find your reading atmosphere' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Midnight' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Manage library' }).click();
  await expect(
    page.getByRole('heading', { name: 'A thoughtful library starts here' }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toContainText('does not accept uploads');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
