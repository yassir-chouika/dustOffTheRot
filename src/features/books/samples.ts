import JSZip from 'jszip';
import type { BookFormat } from '../../types';

// Original sample text and generated files belong to this app. No imported book binaries.
export const sampleParagraphs = [
  'The afternoon light moved slowly across the room. A cup of tea waited beside the window. There was nowhere else to be, and nothing that needed to happen before the next page.',
  'Outside, the trees made small shadows on the path. A bicycle leaned against the garden wall. For a while, the ordinary things were enough: the warm cup, the open window, the sound of a distant train.',
  'Reading began as a small promise. Ten quiet minutes, a comfortable chair, a story allowed to unfold in its own time. The rest of the day could wait on the other side of the door.',
  'By evening, a little rain had arrived. It softened the street and gathered in the leaves. The lamp came on. Another chapter opened, and the room felt a little more like home.',
];
const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export async function createSampleFile(format: BookFormat, title = 'A Little Room'): Promise<Blob> {
  if (format === 'PDF') {
    const ascii = (text: string) => text.replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
    const streams = [0, 1].map((page) => {
      const lines = [
        `${title} - Folio sample`,
        '',
        `Chapter ${page + 1}`,
        '',
        ...sampleParagraphs
          .slice(page * 2, page * 2 + 2)
          .flatMap((p) => p.match(/.{1,65}(?:\s|$)/g)?.map((line) => line.trim()) ?? [p]),
        '',
        `Page ${page + 1} of 2`,
      ];
      return `BT /F1 14 Tf 22 TL 54 730 Td ${lines.map((line, i) => `${i ? 'T* ' : ''}(${ascii(line)}) Tj`).join('\n')} ET`;
    });
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${streams[0].length} >>\nstream\n${streams[0]}\nendstream`,
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
      `<< /Length ${streams[1].length} >>\nstream\n${streams[1]}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const start = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${start}\n%%EOF`;
    return new Blob([pdf], { type: 'application/pdf' });
  }
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  zip.file(
    'EPUB/package.opf',
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">folio-original-sample</dc:identifier><dc:title>${escapeXml(title)}</dc:title><dc:creator>Folio</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>`,
  );
  zip.file(
    'EPUB/nav.xhtml',
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="one.xhtml">A moment to yourself</a></li><li><a href="two.xhtml">One more chapter</a></li></ol></nav></body></html>',
  );
  ['one', 'two'].forEach((name, index) =>
    zip.file(
      `EPUB/${name}.xhtml`,
      `<html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>${index ? 'One more chapter' : 'A moment to yourself'}</title></head><body><h1>${index ? 'One more chapter' : 'A moment to yourself'}</h1>${[...sampleParagraphs, ...sampleParagraphs, ...sampleParagraphs].map((p) => `<p>${escapeXml(p)}</p>`).join('')}</body></html>`,
    ),
  );
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  });
}
