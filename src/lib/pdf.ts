/**
 * Client-side "Download PDF": renders a document element to an A4 PDF.
 * The page is rasterized (html2canvas), which keeps Hebrew/RTL exactly as on screen.
 */
export async function downloadElementAsPdf(element: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

  const margin = 10;
  const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
  const imgH = (canvas.height * pageW) / canvas.width;

  if (imgH <= pageH) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, pageW, imgH);
  } else {
    // Long documents: slice the canvas into A4-sized pages.
    const sliceHeightPx = Math.floor((pageH * canvas.width) / pageW);
    for (let y = 0, page = 0; y < canvas.height; y += sliceHeightPx, page++) {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.min(sliceHeightPx, canvas.height - y);
      slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, pageW, (slice.height * pageW) / canvas.width);
    }
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
