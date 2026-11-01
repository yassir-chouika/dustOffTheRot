import { cp, mkdir, rm, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const source = dirname(require.resolve('pdfjs-dist/package.json'));
await rm(join('public', 'pdfjs'), { recursive: true, force: true });
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  await mkdir(join('public', 'pdfjs', folder), { recursive: true });
  await cp(join(source, folder), join('public', 'pdfjs', folder), { recursive: true });
}

// Retain third-party copyright and license notices alongside the built app.
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const seen = new Set();
const notices = ['Folio — Third-party software notices\nThese licenses cover dependencies, not the application source.\n'];
for (const [directory, entry] of Object.entries(lock.packages)) {
  if (!directory.startsWith('node_modules/') || entry.dev) continue;
  try {
    const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    const id = `${metadata.name}@${metadata.version}`;
    if (seen.has(id)) continue;
    seen.add(id);
    notices.push(`\n${'='.repeat(72)}\n${id}\nLicense: ${metadata.license ?? 'See package notices'}\n`);
    for (const name of await readdir(directory)) if (/^(license|licence|notice)(\..*)?$/i.test(name)) {
      try { notices.push(await readFile(join(directory, name), 'utf8')); } catch { /* Some packages use a license directory. */ }
    }
  } catch { /* Optional dependencies for other operating systems are not installed. */ }
}
await writeFile('public/third-party-notices.txt', notices.join('\n'));
