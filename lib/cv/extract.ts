/**
 * Text extraction for CVs — no external services.
 * PDF (layout-aware, multi-column), DOCX (body + headers/footers + text boxes + tables), DOC, RTF, ODT, TXT/HTML,
 * images and scanned PDFs (offline OCR with bundled English model).
 */
import JSZip from 'jszip';

export type Extracted = { text: string; method: string; pages?: number; warnings: string[] };

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');

export function detectType(name: string, buf: Buffer): string {
  const head = buf.subarray(0, 8);
  if (head.subarray(0, 4).toString() === '%PDF') return 'pdf';
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) return 'doc';
  if (head.subarray(0, 5).toString() === '{\\rtf') return 'rtf';
  if (head[0] === 0x89 && head.subarray(1, 4).toString() === 'PNG') return 'image';
  if (head[0] === 0xff && head[1] === 0xd8) return 'image';
  if (head.subarray(0, 4).toString() === 'RIFF' || head.subarray(0, 3).toString() === 'GIF') return 'image';
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (head[0] === 0x50 && head[1] === 0x4b) return ext === 'odt' ? 'odt' : 'docx';
  if (['htm', 'html'].includes(ext)) return 'html';
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff', 'gif'].includes(ext)) return 'image';
  return 'txt';
}

// ---------------- PDF ----------------
type Item = { str: string; x: number; y: number; w: number; h: number };

function itemsToLines(items: Item[], pageWidth: number): string[] {
  if (!items.length) return [];
  // detect a two-column layout: a vertical gutter crossed by few items, with text on both sides
  const left = Math.min(...items.map((i) => i.x));
  const right = Math.max(...items.map((i) => i.x + i.w));
  let gutter: number | null = null;
  const bins = 60;
  const step = (right - left) / bins;
  if (step > 0) {
    const cover = new Array(bins).fill(0);
    for (const it of items) {
      const a = Math.max(0, Math.floor((it.x - left) / step));
      const b = Math.min(bins - 1, Math.floor((it.x + it.w - left) / step));
      for (let k = a; k <= b; k++) cover[k]++;
    }
    let best = -1; let bestScore = Infinity;
    for (let k = Math.floor(bins * 0.22); k < Math.floor(bins * 0.72); k++) {
      if (cover[k] < bestScore) { bestScore = cover[k]; best = k; }
    }
    const gx = left + (best + 0.5) * step;
    const l = items.filter((i) => i.x + i.w <= gx).length;
    const r = items.filter((i) => i.x >= gx).length;
    const crossing = items.filter((i) => i.x < gx && i.x + i.w > gx).length;
    if (best >= 0 && crossing <= Math.max(1, items.length * 0.02) && l > items.length * 0.15 && r > items.length * 0.15) {
      // the gutter must also separate distinct lines, not just word gaps on one line
      const ys = new Set(items.filter((i) => i.x + i.w <= gx).map((i) => Math.round(i.y / 3)));
      const ysR = new Set(items.filter((i) => i.x >= gx).map((i) => Math.round(i.y / 3)));
      const shared = [...ys].filter((y) => ysR.has(y)).length;
      if (shared < Math.min(ys.size, ysR.size) * 0.85) gutter = gx;
    }
  }
  const group = (arr: Item[]) => {
    const sorted = [...arr].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Item[][] = [];
    for (const it of sorted) {
      const tol = Math.max(2, it.h * 0.45);
      const line = lines.find((l) => Math.abs(l[0].y - it.y) <= tol);
      line ? line.push(it) : lines.push([it]);
    }
    lines.sort((a, b) => b[0].y - a[0].y);
    const out: string[] = [];
    let prevY: number | null = null; let prevH = 10;
    for (const l of lines) {
      l.sort((a, b) => a.x - b.x);
      let s = '';
      let endX: number | null = null;
      for (const it of l) {
        if (endX != null) {
          const gap = it.x - endX;
          if (gap > Math.max(it.h, 6) * 1.5) s += '   ';
          else if (gap > it.h * 0.12 && !s.endsWith(' ') && !it.str.startsWith(' ')) s += ' ';
        }
        s += it.str;
        endX = it.x + it.w;
      }
      const y = l[0].y;
      if (prevY != null && prevY - y > prevH * 1.9) out.push('');
      out.push(s.replace(/\s+$/, ''));
      prevY = y; prevH = Math.max(...l.map((i) => i.h)) || 10;
    }
    return out;
  };
  if (gutter == null) return group(items);
  const leftItems = items.filter((i) => i.x < gutter!);
  const rightItems = items.filter((i) => i.x >= gutter!);
  // read the narrower column (usually contact/skills sidebar) after the main column only if it is on the right
  return [...group(leftItems), '', ...group(rightItems)];
}

async function pdfText(buf: Buffer): Promise<Extracted> {
  const { getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const lines: string[] = [];
  const links: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items: Item[] = (tc.items as any[]).filter((i) => typeof i.str === 'string' && i.str.length)
      .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: Math.abs(i.transform[3]) || i.height || 10 }));
    lines.push(...itemsToLines(items, vp.width), '');
    try {
      const ann = await page.getAnnotations();
      for (const a of ann as any[]) if (a.url) links.push(a.url);
    } catch { /* ignore */ }
  }
  let text = lines.join('\n');
  if (links.length) text += '\n' + [...new Set(links)].join('\n');
  return { text, method: 'pdf-text', pages: doc.numPages, warnings: [] };
}

// ---------------- OCR ----------------
async function ocrImages(images: Buffer[]): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const path = await import('node:path');
  const langPath = path.join(process.cwd(), 'node_modules', '@tesseract.js-data', 'eng', '4.0.0');
  const worker = await createWorker('eng', 1, { langPath, gzip: true, cachePath: process.env.TESSERACT_CACHE_DIR || path.join(process.cwd(), '.cache', 'tesseract') } as any);
  try {
    const out: string[] = [];
    for (const img of images) {
      const { data } = await worker.recognize(img);
      out.push(data.text);
    }
    return out.join('\n\n');
  } finally {
    await worker.terminate();
  }
}

async function pdfOcr(buf: Buffer, maxPages = 6): Promise<string> {
  const { getDocumentProxy, renderPageAsImage } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(buf), { canvasFactory: undefined } as any);
  const pages = Math.min(doc.numPages, maxPages);
  const images: Buffer[] = [];
  for (let p = 1; p <= pages; p++) {
    const fresh = new Uint8Array(buf); // pdf.js transfers the buffer, so give each render its own copy
    const png = await renderPageAsImage(fresh, p, { canvasImport: () => import('@napi-rs/canvas'), scale: 2.2 });
    images.push(Buffer.from(png));
  }
  return ocrImages(images);
}

// ---------------- DOCX / ODT ----------------
function wordXmlToText(xml: string): string {
  // paragraphs → lines; tabs → spaces; breaks → newlines; table cells separated
  return decodeXml(
    xml
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<\/w:p>\s*<\/w:tc>/g, '</w:tc>')
      .replace(/<\/w:tc>/g, ' | ')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g, '')
      .replace(/<[^>]+>/g, ''),
  ).replace(/ \| \n/g, '\n');
}

async function docxText(buf: Buffer): Promise<Extracted> {
  const zip = await JSZip.loadAsync(buf);
  const parts: string[] = [];
  const names = Object.keys(zip.files);
  const headers = names.filter((n) => /^word\/header\d*\.xml$/.test(n));
  const footers = names.filter((n) => /^word\/footer\d*\.xml$/.test(n));
  for (const n of headers) parts.push(wordXmlToText(await zip.file(n)!.async('string')));
  const body = await zip.file('word/document.xml')?.async('string');
  if (!body) throw new Error('Not a valid Word document');
  // text boxes appear inside mc:AlternateContent twice (Choice + Fallback) — keep only the Choice copy
  const cleaned = body.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');
  parts.push(wordXmlToText(cleaned));
  for (const n of footers) parts.push(wordXmlToText(await zip.file(n)!.async('string')));
  const rels = await zip.file('word/_rels/document.xml.rels')?.async('string');
  const links = rels ? [...rels.matchAll(/Target="(https?:[^"]+|mailto:[^"]+)"/g)].map((m) => decodeXml(m[1])) : [];
  return { text: parts.join('\n') + (links.length ? '\n' + links.join('\n') : ''), method: 'docx', warnings: [] };
}

async function odtText(buf: Buffer): Promise<Extracted> {
  const zip = await JSZip.loadAsync(buf);
  const styles = (await zip.file('styles.xml')?.async('string')) || '';
  const header = (styles.match(/<style:header>[\s\S]*?<\/style:header>/g) || []).join('\n');
  const xml = header + ((await zip.file('content.xml')?.async('string')) || '');
  const text = decodeXml(xml.replace(/<text:tab\/>/g, '\t').replace(/<text:line-break\/>/g, '\n').replace(/<\/text:(p|h)>/g, '\n').replace(/<[^>]+>/g, ''));
  return { text, method: 'odt', warnings: [] };
}

// ---------------- DOC / RTF / HTML ----------------
async function docText(buf: Buffer): Promise<Extracted> {
  const WordExtractor = (await import('word-extractor')).default as any;
  const ex = new WordExtractor();
  const d = await ex.extract(buf);
  const text = [d.getHeaders({ includeFooters: false }), d.getBody(), d.getTextboxes?.({ includeHeadersAndFooters: false, includeBody: true }), d.getFootnotes(), d.getFooters?.()].filter(Boolean).join('\n');
  return { text, method: 'doc', warnings: [] };
}

export function rtfToText(rtf: string): string {
  let s = rtf.replace(/\\endash ?/g, '–').replace(/\\emdash ?/g, '—').replace(/\\bullet ?/g, '•').replace(/\\[lr]quote ?/g, "'").replace(/\\[lr]dblquote ?/g, '"').replace(/\\~/g, ' ')
    .replace(/\\par[d]?\b/g, '\n').replace(/\\line\b/g, '\n').replace(/\\tab\b/g, '\t');
  s = s.replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)));
  // drop destination groups like {\fonttbl ...} {\colortbl ...} {\*\... }
  for (let i = 0; i < 5; i++) s = s.replace(/\{\\(\*|fonttbl|colortbl|stylesheet|info|pict|header|footer)[^{}]*\}/g, '');
  s = s.replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
  return s;
}
export function htmlToText(html: string): string {
  return decodeXml(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' '));
}

const meaningful = (t: string) => (t.match(/[A-Za-z]{2,}/g) || []).length;

export async function extractText(fileName: string, buf: Buffer, opts: { ocr?: boolean } = {}): Promise<Extracted> {
  const type = detectType(fileName, buf);
  const ocr = opts.ocr !== false;
  let r: Extracted;
  switch (type) {
    case 'pdf': {
      r = await pdfText(buf);
      if (meaningful(r.text) < Math.max(8, 4 * (r.pages || 1)) && ocr) {
        const t = await pdfOcr(buf);
        r = { text: t, method: 'pdf-ocr', pages: r.pages, warnings: ['This PDF is a scanned image, so its text was read with OCR. Check the fields carefully.'] };
      }
      break;
    }
    case 'docx': r = await docxText(buf); break;
    case 'odt': r = await odtText(buf); break;
    case 'doc': r = await docText(buf); break;
    case 'rtf': r = { text: rtfToText(buf.toString('latin1')), method: 'rtf', warnings: [] }; break;
    case 'html': r = { text: htmlToText(buf.toString('utf8')), method: 'html', warnings: [] }; break;
    case 'image':
      if (!ocr) throw new Error('Image CVs need OCR, which is switched off');
      r = { text: await ocrImages([buf]), method: 'image-ocr', warnings: ['This CV is an image, so its text was read with OCR. Check the fields carefully.'] };
      break;
    default: {
      const t = buf.toString('utf8');
      r = { text: t.startsWith('{\\rtf') ? rtfToText(t) : t, method: 'text', warnings: [] };
    }
  }
  if (meaningful(r.text) < 15) r.warnings.push('Very little readable text was found in this file.');
  return r;
}
