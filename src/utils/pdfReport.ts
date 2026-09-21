import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

/**
 * Растрирует inline-SVG в PNG data-URL (html2canvas не рисует SVG нативно).
 * Сериализуем SVG, добавляем явные ширину/высоту и рисуем на канвасе в x2.
 */
async function svgToPngDataUrl(svg: SVGSVGElement): Promise<string> {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const rawW = rect.width || vb.width || 600;
  const rawH = rect.height || vb.height || Math.round(vb.width * 0.4);
  const scale = 2;
  const w = Math.max(2, Math.round(rawW * scale));
  const h = Math.max(2, Math.round(rawH * scale));

  let markup = new XMLSerializer().serializeToString(svg);
  markup = markup.replace(
    /<svg([^>]*)>/,
    (_m, attrs) => `<svg${attrs} width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`
  );

  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Ошибка растрирования SVG-графика'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Нет 2D-контекста');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Снимок DOM-элемента отчёта в многостраничный PDF.
 * Использует html2canvas-pro (поддержка oklch, стилей Tailwind 4).
 */
export async function downloadPdfReport(elementId: string, fileName: string): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Элемент отчёта не найден');

  // Заменяем inline-SVG на растровые <img> на время захвата
  const injected: { svg: SVGSVGElement; img: HTMLImageElement }[] = [];
  for (const node of Array.from(el.querySelectorAll('svg'))) {
    const svg = node as SVGSVGElement;
    try {
      const dataUrl = await svgToPngDataUrl(svg);
      const rect = svg.getBoundingClientRect();
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = `${Math.max(1, rect.width)}px`;
      img.style.display = 'block';
      svg.style.display = 'none';
      svg.parentElement?.insertBefore(img, svg);
      injected.push({ svg, img });
    } catch (e) {
      console.warn('SVG-график пропущен в PDF:', e);
    }
  }

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#f1f5f9',
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    const drawableH = pageH - margin * 2;

    let position = margin;
    pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
    position -= drawableH;

    // Multi-page split: each next page starts at negative offset that aligns
    // the next slice of the tall image at the top of the page
    let remaining = imgH - drawableH;
    while (remaining > 0) {
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, margin - imgH + remaining, imgW, imgH);
      remaining -= drawableH;
    }

    pdf.save(fileName);
  } finally {
    injected.forEach(({ svg, img }) => {
      img.remove();
      svg.style.display = '';
    });
  }
}