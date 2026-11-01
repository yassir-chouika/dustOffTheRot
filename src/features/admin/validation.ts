import JSZip from 'jszip';
import type { BookFormat } from '../../types';

export const MAX_BOOK_BYTES = 50 * 1024 * 1024;
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 40 * 1024 * 1024;
export interface FileMetadata {
  format: BookFormat;
  title: string;
  author: string;
  length: string;
  language: string;
}

function xmlDocument(text: string): Document {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('This EPUB uses unsupported XML entities.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('This EPUB contains invalid XML.');
  return doc;
}

export async function validateEpub(buffer: ArrayBuffer): Promise<FileMetadata> {
  const view = new DataView(buffer);
  if (buffer.byteLength < 22 || view.getUint32(0, true) !== 0x04034b50)
    throw new Error('This file is not an EPUB ZIP archive.');
  let end = -1;
  for (
    let index = buffer.byteLength - 22;
    index >= Math.max(0, buffer.byteLength - 65557);
    index--
  ) {
    if (
      view.getUint32(index, true) === 0x06054b50 &&
      index + 22 + view.getUint16(index + 20, true) === buffer.byteLength
    ) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error('The EPUB archive is incomplete or damaged.');
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  let declared = 0;
  if (count > 1000 || count === 0 || view.getUint16(end + 4, true) !== 0)
    throw new Error('This EPUB has too many entries or uses an unsupported archive format.');
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error('The EPUB archive directory is damaged.');
    const flags = view.getUint16(cursor + 8, true);
    const expanded = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    if (cursor + 46 + nameLength + extraLength + commentLength > end)
      throw new Error('The EPUB archive directory is damaged.');
    const name = new TextDecoder().decode(new Uint8Array(buffer, cursor + 46, nameLength));
    if (
      flags & 1 ||
      expanded > 15 * 1024 * 1024 ||
      name.split(/[\\/]/).includes('..') ||
      /^[\\/]|^[a-z]:/i.test(name)
    )
      throw new Error('The EPUB contains encrypted, oversized, or unsafe entries.');
    declared += expanded;
    if (declared > MAX_EXPANDED_BYTES)
      throw new Error('This EPUB expands beyond the supported 40 MB limit.');
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  const zip = await JSZip.loadAsync(buffer);
  let actual = 0;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    await new Promise<void>((resolve, reject) => {
      let entrySize = 0;
      const stream = (
        entry as JSZip.JSZipObject & {
          internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array>;
        }
      ).internalStream('uint8array');
      stream
        .on('data', (chunk: Uint8Array) => {
          entrySize += chunk.byteLength;
          actual += chunk.byteLength;
          if (actual > MAX_EXPANDED_BYTES || entrySize > 15 * 1024 * 1024) {
            stream.pause();
            reject(new Error('This EPUB expands beyond the supported size limit.'));
          }
        })
        .on('error', reject)
        .on('end', resolve)
        .resume();
    });
  }
  if ((await zip.file('mimetype')?.async('string'))?.trim() !== 'application/epub+zip')
    throw new Error('The archive is missing the EPUB media signature.');
  const containerText = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerText || containerText.length > 100000)
    throw new Error('The EPUB container is missing or invalid.');
  const root = xmlDocument(containerText)
    .getElementsByTagNameNS('*', 'rootfile')[0]
    ?.getAttribute('full-path');
  if (!root || root.split('/').includes('..')) throw new Error('The EPUB package path is invalid.');
  const packageText = await zip.file(root)?.async('string');
  if (!packageText || packageText.length > 1000000)
    throw new Error('The EPUB package is missing or too large.');
  const doc = xmlDocument(packageText);
  if (!doc.getElementsByTagNameNS('*', 'spine')[0]?.children.length)
    throw new Error('The EPUB contains no readable chapters.');
  const text = (tag: string) =>
    (doc.getElementsByTagNameNS('*', tag)[0]?.textContent ?? '').trim().slice(0, 300);
  return {
    format: 'EPUB',
    title: text('title'),
    author: text('creator'),
    language: text('language').slice(0, 35) || 'en',
    length: `${doc.getElementsByTagNameNS('*', 'itemref').length} sections`,
  };
}

export async function validateBookFile(file: File): Promise<FileMetadata> {
  if (!file.size) throw new Error('Choose a file that contains a book.');
  if (file.size > MAX_BOOK_BYTES) throw new Error('Books must be 50 MB or smaller.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'pdf' && ext !== 'epub') throw new Error('Choose a PDF or EPUB file.');
  const bytes = await file.arrayBuffer();
  if (ext === 'epub') return validateEpub(bytes);
  if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-'))
    throw new Error('The PDF file signature is missing.');
  const { pdfjs } = await import('../../lib/pdf');
  const task = pdfjs.getDocument({
    data: bytes,
    enableXfa: false,
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
  });
  let encrypted = false;
  task.onPassword = () => {
    encrypted = true;
    void task.destroy();
  };
  try {
    const pdf = await task.promise;
    const meta = await pdf.getMetadata();
    const info = meta.info as Record<string, unknown>;
    return {
      format: 'PDF',
      title: typeof info.Title === 'string' ? info.Title.slice(0, 300) : '',
      author: typeof info.Author === 'string' ? info.Author.slice(0, 300) : '',
      language: 'en',
      length: `${pdf.numPages} pages`,
    };
  } catch {
    throw new Error(
      encrypted
        ? 'Upload an unlocked copy of this password-protected PDF.'
        : 'This PDF is damaged or could not be opened.',
    );
  } finally {
    await task.destroy();
  }
}

export async function validateCover(file: File): Promise<'png' | 'jpg' | 'webp'> {
  if (!file.size || file.size > MAX_COVER_BYTES)
    throw new Error('Cover images must be between 1 byte and 5 MB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const ext =
    bytes[0] === 0x89 && text.slice(1, 4) === 'PNG'
      ? 'png'
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        ? 'jpg'
        : text.startsWith('RIFF') && text.slice(8) === 'WEBP'
          ? 'webp'
          : null;
  if (!ext) throw new Error('Choose a PNG, JPEG, or WebP cover image.');
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const pixels = bitmap.width * bitmap.height;
    bitmap.close();
    if (pixels > 20000000) throw new Error('Choose a cover image smaller than 20 megapixels.');
  }
  return ext;
}
