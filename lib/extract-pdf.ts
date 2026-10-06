import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { ExtractedDocument, NoteBlock, SourceType, TextSpan } from './session';

export async function extractPdf(file: File, id: string, sourceType: SourceType): Promise<ExtractedDocument> {
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true, fontExtraProperties: true,
    stopAtErrors: true,
  });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 20) throw new Error('The session supports at most 20 total pages.');
    const lines: { spans: TextSpan[]; size: number; page: number }[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      // Load font metadata so available bold/italic cues survive text extraction.
      await page.getOperatorList();
      const content = await page.getTextContent();
      const items = content.items.filter((item): item is TextItem => 'str' in item && !!item.str.trim());
      if (!items.length) throw new Error(`Page ${pageNumber} has no selectable text. Scanned or empty pages are not supported.`);
      items.sort((a, b) => Math.abs(a.transform[5] - b.transform[5]) > 2 ? b.transform[5] - a.transform[5] : a.transform[4] - b.transform[4]);
      let last: TextItem | undefined;
      for (const item of items) {
        const size = Math.hypot(item.transform[2], item.transform[3]);
        const font: { name?: string } = page.commonObjs.has(item.fontName) ? page.commonObjs.get(item.fontName) : {};
        const name = font.name ?? content.styles[item.fontName]?.fontFamily ?? '';
        const sameLine = last && Math.abs(last.transform[5] - item.transform[5]) <= 2;
        const span = { text: item.str, bold: /bold|black|heavy|demi/i.test(name), italic: /italic|oblique/i.test(name) };
        if (sameLine) {
          const line = lines[lines.length - 1];
          const gap = item.transform[4] - (last!.transform[4] + last!.width);
          if (gap > size * 0.15 && !/\s$/.test(line.spans[line.spans.length - 1].text) && !/^\s/.test(span.text)) span.text = ' ' + span.text;
          line.spans.push(span);
          line.size = Math.max(line.size, size);
        } else lines.push({ spans: [span], size, page: pageNumber });
        last = item;
      }
      page.cleanup();
    }
    // Weight sizes by text length so short titles do not define the body size.
    const sizes = new Map<number, number>();
    for (const line of lines) sizes.set(line.size, (sizes.get(line.size) ?? 0) + line.spans.reduce((n, span) => n + span.text.length, 0));
    const bodySize = [...sizes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12;
    const quotations = lines.map(line => line.spans.map(span => span.text).join(''));
    const blocks: NoteBlock[] = lines.map((line, index) => ({
      id: `${id}-block-${index}`, page: line.page, spans: line.spans,
      kind: line.size > bodySize * 1.15 ? 'heading' : 'paragraph',
      quotation: quotations[index], context: quotations.slice(Math.max(0, index - 1), index + 2).join('\n'),
    }));
    return { id, name: file.name, sourceType, pageCount: pdf.numPages, blocks };
  } catch (error) {
    if (error instanceof Error && /20 total pages|no selectable text/.test(error.message)) throw error;
    throw new Error('Could not extract this PDF. It may be unreadable, damaged, or password-protected. Try an unlocked selectable-text PDF.');
  } finally {
    await task.destroy();
  }
}
