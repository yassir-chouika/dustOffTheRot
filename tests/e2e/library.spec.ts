import { expect, test } from '@playwright/test';

test('search, filter, open details, and persist a personal shelf', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'A Place Between by Elena Marlow', exact: true }),
  ).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search books' }).fill('Solis');
  await expect(page.getByRole('status')).toContainText('1 book');
  await page
    .getByRole('link', { name: 'Where the River Bends by Mira Solis', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Where the River Bends', exact: true }),
  ).toBeVisible();
  await page.getByLabel('On your shelf').selectOption('want-to-read');
  await page.getByRole('button', { name: 'Favorite Where the River Bends', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('On your shelf')).toHaveValue('want-to-read');
  await expect(
    page.getByRole('button', { name: 'Favorite Where the River Bends', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('link', { name: 'Back to library', exact: false }).click();
  await page.getByRole('searchbox', { name: 'Search books' }).fill('no-such-book');
  await expect(page.getByRole('heading', { name: 'No books in this corner yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('PDF');
  await expect(page.getByRole('status')).toContainText('3 books');
  await page.getByRole('combobox', { name: 'Format', exact: true }).selectOption('all');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('library.png'), fullPage: true, scale: 'css' });
});
