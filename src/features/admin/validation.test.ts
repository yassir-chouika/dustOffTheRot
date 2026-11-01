import { describe, expect, it } from 'vitest';
import { createSampleFile } from '../books/samples';
import { MAX_BOOK_BYTES, validateBookFile, validateCover, validateEpub } from './validation';

async function bytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}
function file(name: string, content: string, size = content.length) {
  return { name, size, arrayBuffer: async () => new TextEncoder().encode(content).buffer } as File;
}
describe('book import validation', () => {
  it('extracts metadata from an original, valid EPUB', async () => {
    const result = await validateEpub(
      await bytes(await createSampleFile('EPUB', 'A Quiet Sample')),
    );
    expect(result).toMatchObject({
      format: 'EPUB',
      title: 'A Quiet Sample',
      author: 'Folio',
      length: '2 sections',
    });
  });
  it('blocks oversized files, renamed binaries, unsafe covers, and damaged archives', async () => {
    await expect(validateBookFile(file('huge.pdf', '', MAX_BOOK_BYTES + 1))).rejects.toThrow(
      '50 MB',
    );
    await expect(validateBookFile(file('renamed.pdf', 'not a PDF'))).rejects.toThrow('signature');
    await expect(validateBookFile(file('not-a-book.txt', 'hello'))).rejects.toThrow('PDF or EPUB');
    await expect(
      validateCover({
        size: 16,
        slice: () => ({
          arrayBuffer: async () => new TextEncoder().encode('<svg onload=x>').buffer,
        }),
      } as unknown as File),
    ).rejects.toThrow('PNG, JPEG, or WebP');
    await expect(validateEpub(new ArrayBuffer(30))).rejects.toThrow('EPUB ZIP');
  });
  it('rejects dangerous expansion sizes before decompressing an EPUB', async () => {
    const buffer = await bytes(await createSampleFile('EPUB'));
    const view = new DataView(buffer);
    for (let i = 0; i < buffer.byteLength - 46; i++)
      if (view.getUint32(i, true) === 0x02014b50) {
        view.setUint32(i + 24, 1000000000, true);
        break;
      }
    await expect(validateEpub(buffer)).rejects.toThrow('oversized');
  });
});
