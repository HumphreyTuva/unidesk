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

// "ICS 2201 Introduction to Programming.pdf" -> "ICS2201". Used to pre-fill the form; the admin can change it.
export function guessUnitCode(filename: string): string {
  const m = filename.toUpperCase().match(/([A-Z]{2,6})[\s_-]*(\d{2,5}[A-Z]?)/);
  return m ? m[1] + m[2] : '';
}
