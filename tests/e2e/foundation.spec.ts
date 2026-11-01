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

test('reading preferences support keyboard help, themes, and motion settings', async ({
  page,
}, testInfo) => {
  await page.goto('/settings');
  const main = page.getByRole('main');
  for (const [name, id] of [
    ['Midnight', 'midnight'],
    ['Forest', 'forest'],
    ['Classic', 'classic'],
    ['Warm Paper', 'paper'],
  ]) {
    await main.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', id);
    await expect(main.getByRole('button', { name, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  const help = page.getByRole('button', { name: 'How atmospheres work' });
  await help.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'A little light, just for you' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(help).toBeFocused();
  await page.getByRole('checkbox', { name: 'Reduce interface motion' }).check();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.getByRole('checkbox', { name: 'Reduce interface motion' })).toBeChecked();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(help).toHaveCSS('transition-duration', '0s');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath('reading-preferences.png'),
    fullPage: true,
    scale: 'css',
  });
  if (testInfo.project.name === 'mobile') {
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await menu.click();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
  }
});
