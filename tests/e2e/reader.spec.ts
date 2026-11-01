import { expect, test } from '@playwright/test';

test.setTimeout(60000);
test('PDF pages, bookmarks, saved position, and focus mode work', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/read/under-a-distant-sun');
  await expect(page.locator('.pdf-page canvas').first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.reader-location')).toContainText('Page 1 of 2');
  await expect(page.locator('.textLayer')).toContainText('Folio sample');
  await page.getByRole('button', { name: 'Bookmark this location', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Bookmark saved.');
  await page.getByRole('button', { name: 'Dismiss reading notice' }).click();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.locator('.reader-location')).toContainText('Page 2 of 2');
  await expect(page.locator('.reader-save')).toContainText('Saved on this device');
  await page.reload();
  await expect(page.locator('.reader-location')).toContainText('Page 2 of 2', { timeout: 20000 });
  await page.getByRole('button', { name: /Bookmarks/ }).click();
  await page
    .getByRole('complementary', { name: 'Saved bookmarks' })
    .getByRole('button', { name: /^Page 1 of 2/ })
    .click();
  await expect(page.locator('.reader-location')).toContainText('Page 1 of 2');
  await page.getByRole('button', { name: 'Enter focus mode' }).click();
  await expect(page.locator('.reader-shell')).toHaveClass(/focused/);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.reader-location')).toContainText('Page 2 of 2');
  await page.getByRole('button', { name: 'Exit focus mode' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath('pdf-reader.png'),
    fullPage: true,
    scale: 'css',
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A little room for reading.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('EPUB chapters, typography, sandboxing, and CFI restoration work', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/read/a-place-between');
  await expect(page.locator('.epub-host iframe').first()).toBeVisible({ timeout: 20000 });
  await expect(
    page
      .frameLocator('.epub-host iframe')
      .first()
      .getByRole('heading', { name: 'A moment to yourself' }),
  ).toBeVisible();
  await expect(page.locator('.epub-host iframe').first()).not.toHaveAttribute(
    'sandbox',
    /allow-scripts/,
  );
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Chapters' })
    .getByRole('button', { name: 'One more chapter' })
    .click();
  await expect(
    page
      .frameLocator('.epub-host iframe')
      .first()
      .getByRole('heading', { name: 'One more chapter' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reading settings', exact: true }).click();
  await page.getByRole('slider', { name: /Text size/ }).focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Close reader panel' }).click();
  await expect(page.locator('.reader-save')).toContainText('Saved on this device');
  const position = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('folio.demo.position.v1.a-place-between') ?? 'null'),
  );
  expect(position.locator.type).toBe('epub');
  expect(position.locator.cfi).toMatch(/^epubcfi\(/);
  await page.reload();
  await expect(page.locator('.reader-location')).toContainText('One more chapter', {
    timeout: 20000,
  });
  await expect(page.frameLocator('.epub-host iframe').first().locator('body')).toHaveCSS(
    'font-size',
    '24px',
  );
  await page.getByRole('button', { name: 'Reading settings', exact: true }).click();
  await page.getByRole('combobox', { name: 'Page layout', exact: true }).selectOption('scroll');
  await expect(page.locator('.epub-stage')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Close reader panel' }).click();
  await expect(page.locator('.reader-location')).toContainText('One more chapter');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath('epub-reader.png'),
    fullPage: true,
    scale: 'css',
  });
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A little room for reading.' })).toBeVisible();
  expect(errors).toEqual([]);
});
