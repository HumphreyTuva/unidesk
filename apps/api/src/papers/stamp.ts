import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';

export const STAMP_TEXT = 'Downloaded from unidesk.co.ke · KU past papers';
const MAX_STAMP_BYTES = 25 * 1024 * 1024;

// Adds one small grey line at the bottom of every page, linked to the site. The stored original is never changed.
// If anything goes wrong (locked or damaged PDF, too large) the original bytes are returned, so a download never fails because of this.
export async function stampPdf(input: Buffer, url: string): Promise<Buffer> {
  if (input.length > MAX_STAMP_BYTES) return input;
  try {
    const pdf = await PDFDocument.load(input, { updateMetadata: false });
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const size = 8;
    for (const page of pdf.getPages()) {
      if (page.getRotation().angle % 360 !== 0) continue; // sideways pages are left alone
      const { x, y, width } = page.getCropBox();
      if (width < 220) continue;
      const w = font.widthOfTextAtSize(STAMP_TEXT, size);
      const tx = x + (width - w) / 2, ty = y + 7;
      page.drawRectangle({ x: tx - 6, y: ty - 3, width: w + 12, height: size + 6, color: rgb(1, 1, 1), opacity: 0.82 });
      page.drawText(STAMP_TEXT, { x: tx, y: ty, size, font, color: rgb(0.36, 0.4, 0.47) });
      const link = pdf.context.register(pdf.context.obj({
        Type: 'Annot', Subtype: 'Link', Rect: [tx - 6, ty - 3, tx + w + 6, ty + size + 3], Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
      }));
      page.node.addAnnot(link);
    }
    return Buffer.from(await pdf.save());
  } catch {
    return input;
  }
}
