// Makes the low-resolution preview image (page 1 of the PDF) in the admin's own browser, so the server needs no PDF tools.
// If anything goes wrong we return null and the paper is uploaded without a preview.
export async function makePreview(file: File, maxWidth = 640): Promise<Blob | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2, maxWidth / base.width) });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.6));
  } catch {
    return null;
  }
}

// Renders every page (up to 30) as a JPEG, so students can read the paper in the app while the PDF itself stays private.
// The blank margins around the text are cropped away (the same crop on every page, so pages stay the same size), which makes the
// text much larger on a phone. Returns [] if it cannot be done; the paper still uploads and students see the first-page preview.
export async function makePages(file: File, maxPages = 30, textWidth = 1100): Promise<Blob[]> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const count = Math.min(doc.numPages, maxPages);

    const draw = async (page: any, scale: number) => {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('no canvas');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return { canvas, ctx };
    };

    // Pass 1: a small render of every page, only to find where the ink is. Result: fractions of the page (0..1).
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (let n = 1; n <= count; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const { canvas, ctx } = await draw(page, 320 / base.width);
      const { width: w, height: h } = canvas;
      const px = ctx.getImageData(0, 0, w, h).data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (px[i] + px[i + 1] + px[i + 2] < 690) { // anything darker than near-white
            if (x < x0 * w) x0 = x / w;
            if (x > x1 * w) x1 = x / w;
            if (y < y0 * h) y0 = y / h;
            if (y > y1 * h) y1 = y / h;
          }
        }
      }
      canvas.width = 0;
      page.cleanup();
    }
    // A little breathing room, and never crop away more than half of the page (a scan with a dark edge would otherwise confuse it).
    const padX = 0.025, padY = 0.02;
    let cx0 = Math.max(0, x0 - padX), cx1 = Math.min(1, x1 + padX), cy0 = Math.max(0, y0 - padY), cy1 = Math.min(1, y1 + padY);
    if (x1 <= x0 || y1 <= y0 || cx1 - cx0 < 0.5 || cy1 - cy0 < 0.5) { cx0 = 0; cx1 = 1; cy0 = 0; cy1 = 1; }

    // Pass 2: the real render, sharp enough that the cropped text is about `textWidth` pixels wide, then cut out the crop.
    const out: Blob[] = [];
    for (let n = 1; n <= count; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(3, textWidth / ((cx1 - cx0) * base.width));
      const { canvas } = await draw(page, scale);
      const sx = Math.round(cx0 * canvas.width), sy = Math.round(cy0 * canvas.height);
      const sw = Math.round((cx1 - cx0) * canvas.width), sh = Math.round((cy1 - cy0) * canvas.height);
      const cut = document.createElement('canvas');
      cut.width = sw;
      cut.height = sh;
      const cctx = cut.getContext('2d');
      if (!cctx) return [];
      cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      const blob = await new Promise<Blob | null>(resolve => cut.toBlob(b => resolve(b), 'image/jpeg', 0.66));
      canvas.width = 0;
      cut.width = 0;
      if (!blob) return [];
      out.push(blob);
      page.cleanup();
    }
    return out;
  } catch {
    return [];
  }
}

// "ICS 2201 Introduction to Programming.pdf" -> "ICS2201". Used to pre-fill the form; the admin can change it.
export function guessUnitCode(filename: string): string {
  const m = filename.toUpperCase().match(/([A-Z]{2,6})[\s_-]*(\d{2,5}[A-Z]?)/);
  return m ? m[1] + m[2] : '';
}
