import { PDFDocument, StandardFonts } from 'pdf-lib';

// Small generated inputs exercise the real parser; no extraction or network mocks.
export async function pdf(name: string, options: { pages?: number; blank?: boolean; imageOnly?: boolean } = {}) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const italic = await document.embedFont(StandardFonts.HelveticaOblique);
  const pixel = options.imageOnly ? await document.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')) : undefined;
  for (let i = 0; i < (options.pages ?? 1); i++) {
    const page = document.addPage([500, 700]);
    if (pixel) page.drawImage(pixel, { x: 40, y: 400, width: 300, height: 200 });
    else if (!options.blank) {
      page.drawText('Cell biology', { x: 40, y: 640, size: 20, font: bold });
      page.drawText('Cells are the basic units of life.', { x: 40, y: 605, size: 12, font: regular });
      page.drawText('Remember the membrane.', { x: 40, y: 580, size: 12, font: italic });
    }
  }
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(await document.save()) };
}
