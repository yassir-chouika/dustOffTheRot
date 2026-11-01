import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createSampleFile } from '../../src/features/books/samples';
import JSZip from 'jszip';
import { scannedPdf } from '../fixtures/scannedPdf';

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
async function signIn(page: Page, role: 'OWNER' | 'READER') {
  const email = process.env[`FOLIO_${role}_EMAIL`];
  const password = process.env[`FOLIO_${role}_PASSWORD`];
  if (!email || !password)
    throw new Error('Fill the ignored .env.e2e.local file before running cloud tests.');
  await page.goto('/');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).evaluate((input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, password);
  await page.getByRole('button', { name: 'Enter your reading room' }).click();
  await expect(page.getByRole('heading', { name: 'A little room for reading.' })).toBeVisible();
}

test('owner imports; invited reader reads, resumes, bookmarks, and cannot manage books', async ({
  page,
  browser,
}, testInfo) => {
  const owner = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await owner.auth.signInWithPassword({
    email: process.env.FOLIO_OWNER_EMAIL!,
    password: process.env.FOLIO_OWNER_PASSWORD!,
  });
  if (login.error) throw new Error('The local owner test credentials could not sign in.');
  const label = `Folio browser check ${testInfo.project.name} ${crypto.randomUUID().slice(0, 8)}`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const readerContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:5175',
    viewport: { width: testInfo.project.name === 'mobile' ? 390 : 1440, height: 960 },
  });
  const reader = await readerContext.newPage();
  reader.on('pageerror', (error) => errors.push(error.message));
  const imported: { id: string; storage_path: string; cover_path: string | null }[] = [];
  try {
    await signIn(page, 'OWNER');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Make room for a good book.' })).toBeVisible();
    const form = page.getByRole('form', { name: 'Import a book' });
    await form.locator('input[name=book]').setInputFiles({
      name: 'renamed.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not a PDF'),
    });
    await expect(form.getByRole('alert')).toContainText('signature');
    await form.locator('input[name=book]').setInputFiles({
      name: 'broken.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nbroken\n%%EOF'),
    });
    await expect(form.getByRole('alert')).toContainText('damaged');
    for (const format of ['PDF', 'EPUB'] as const) {
      let file = await createSampleFile(format, label + ' ' + format);
      if (format === 'EPUB') {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const chapter = await zip.file('EPUB/one.xhtml')!.async('string');
        zip.file(
          'EPUB/one.xhtml',
          chapter.replace(
            '<body>',
            '<body><script>parent.__folioUntrustedScriptRan=true</script><iframe srcdoc="unsafe"></iframe>',
          ),
        );
        file = new Blob([new Uint8Array(await zip.generateAsync({ type: 'uint8array' })).buffer], {
          type: 'application/epub+zip',
        });
      }
      await form.locator('input[name=book]').setInputFiles({
        name: `original.${format.toLowerCase()}`,
        mimeType: format === 'PDF' ? 'application/pdf' : 'application/epub+zip',
        buffer: Buffer.from(await file.arrayBuffer()),
      });
      await expect(form.getByRole('button', { name: 'Add to library' })).toBeEnabled();
      await form.getByLabel('Title', { exact: true }).fill(label + ' ' + format);
      if (format === 'PDF') {
        const cover = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 300;
          const context = canvas.getContext('2d')!;
          context.fillStyle = '#475d44';
          context.fillRect(0, 0, 200, 300);
          context.fillStyle = '#fffdf8';
          context.font = '28px serif';
          context.fillText('Folio', 65, 150);
          return canvas.toDataURL('image/png').split(',')[1];
        });
        await form.locator('input[name=cover]').setInputFiles({
          name: 'original-cover.png',
          mimeType: 'image/png',
          buffer: Buffer.from(cover, 'base64'),
        });
      }
      await form.getByRole('checkbox', { name: /I have permission/ }).check();
      await form.getByRole('button', { name: 'Add to library' }).click();
      await expect(form.getByRole('status')).toContainText('ready in your library');
      const record = await owner
        .from('books')
        .select('id,storage_path,cover_path')
        .eq('title', label + ' ' + format)
        .single();
      if (record.error) throw new Error('The imported test book was not saved.');
      imported.push(record.data);
    }
    await form
      .locator('input[name=book]')
      .setInputFiles({ name: 'image-only.pdf', mimeType: 'application/pdf', buffer: scannedPdf() });
    await expect(form.getByRole('button', { name: 'Add to library' })).toBeEnabled();
    await form.getByLabel('Title', { exact: true }).fill(label + ' image-only');
    await form.getByRole('checkbox', { name: /I have permission/ }).check();
    await form.getByRole('button', { name: 'Add to library' }).click();
    await expect(form.getByRole('status')).toContainText('ready in your library');
    const scanned = await owner
      .from('books')
      .select('id,storage_path,cover_path')
      .eq('title', label + ' image-only')
      .single();
    if (scanned.error) throw new Error('Image-only test fixture was not saved.');
    imported.push(scanned.data);
    await signIn(reader, 'READER');
    await expect(reader.getByRole('link', { name: 'Manage library' })).toHaveCount(0);
    await reader.goto('/admin');
    await expect(
      reader.getByRole('heading', { name: 'Library management is private' }),
    ).toBeVisible();
    const pdf = imported[0];
    await reader.goto(`/books/${pdf.id}`);
    await expect(reader.locator('.detail-cover img')).toBeVisible();
    await reader.goto(`/read/${pdf.id}`);
    await expect(reader.locator('.pdf-page canvas')).toBeVisible();
    await reader.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(reader.locator('.reader-location')).toContainText('Page 2 of 2');
    await reader.getByRole('button', { name: 'Bookmark this location', exact: true }).click();
    await expect(reader.locator('.reader-save')).toContainText('Position synced');
    await reader.reload();
    await expect(reader.locator('.reader-location')).toContainText('Page 2 of 2');
    await reader.getByRole('button', { name: /Bookmarks/ }).click();
    await expect(reader.getByRole('complementary', { name: 'Saved bookmarks' })).toContainText(
      'Page 2 of 2',
    );
    const epub = imported[1];
    await reader.goto(`/read/${epub.id}`);
    await expect(reader.locator('.epub-host iframe').first()).toBeVisible();
    expect(
      await reader.evaluate(
        () =>
          (window as Window & { __folioUntrustedScriptRan?: boolean }).__folioUntrustedScriptRan,
      ),
    ).toBeUndefined();
    await expect(
      reader.frameLocator('.epub-host iframe').first().locator('script,iframe'),
    ).toHaveCount(0);
    await reader.getByRole('button', { name: 'Contents', exact: true }).click();
    await reader
      .getByRole('navigation', { name: 'Chapters' })
      .getByRole('button', { name: 'One more chapter' })
      .click();
    await expect(reader.locator('.reader-location')).toContainText('One more chapter');
    await expect(reader.locator('.reader-save')).toContainText('Position synced');
    await reader.reload();
    await expect(reader.locator('.reader-location')).toContainText('One more chapter');
    await reader.goto(`/read/${scanned.data.id}`);
    await expect(reader.locator('.pdf-page canvas')).toBeVisible();
    await expect(reader.getByText(/Scanned PDFs need OCR/)).toBeVisible();
    await expect(reader.getByRole('button', { name: 'Start read aloud' })).toBeDisabled();
    await reader.goto('/settings');
    const saveTheme = reader.waitForResponse(
      (response) =>
        response.url().includes('/rest/v1/reader_preferences') &&
        response.request().method() === 'POST',
    );
    await reader.getByRole('main').getByRole('button', { name: 'Forest', exact: true }).click();
    expect((await saveTheme).ok()).toBe(true);
    await reader.reload();
    await expect(reader.locator('html')).toHaveAttribute('data-theme', 'forest');
    await page.getByRole('button', { name: `Edit ${label} PDF` }).click();
    const edit = page.getByRole('dialog', { name: 'Edit book' });
    await edit.getByLabel('Title', { exact: true }).fill(label + ' PDF revised');
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(edit).toHaveCount(0);
    await expect(page.getByText(label + ' PDF revised', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Edit ${label} PDF revised` }).click();
    const replacement = page.getByRole('dialog', { name: 'Edit book' });
    await replacement.getByLabel('Replace book file', { exact: false }).setInputFiles({
      name: 'replacement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(
        await (await createSampleFile('PDF', 'Replacement sample')).arrayBuffer(),
      ),
    });
    await replacement.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(replacement).toHaveCount(0);
    await page
      .getByRole('listitem')
      .filter({ hasText: label + ' PDF revised' })
      .getByRole('button', { name: 'Unpublish', exact: true })
      .click();
    await reader.goto(`/read/${pdf.id}`);
    await expect(reader.getByRole('heading', { name: 'This page is missing' })).toBeVisible();
    await page.getByRole('button', { name: `Remove ${label} PDF revised`, exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Remove this book?' })
      .getByRole('button', { name: 'Remove book and saved positions', exact: true })
      .click();
    await expect(page.getByText(label + ' PDF revised', { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await readerContext.close();
    for (const book of imported) {
      const current = await owner
        .from('books')
        .select('storage_path,cover_path')
        .eq('id', book.id)
        .maybeSingle();
      if (current.data) {
        await owner.storage.from('books').remove([current.data.storage_path]);
        if (current.data.cover_path)
          await owner.storage.from('covers').remove([current.data.cover_path]);
      }
      await owner.storage.from('books').remove([book.storage_path]);
      if (book.cover_path) await owner.storage.from('covers').remove([book.cover_path]);
      await owner.from('books').delete().eq('id', book.id);
    }
    await owner.auth.signOut({ scope: 'local' });
  }
});
