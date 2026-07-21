import { jsPDF } from 'jspdf';
import type { Project, Quotation } from './types';
import quotationLogoUrl from './assets/Logo_Conares.png';

const money = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const triggerDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    image.src = src;
  });

export const downloadQuotationPdf = async (quotation: Quotation) => {
  const safeQuotation = {
    ...quotation,
    items: quotation.items ?? [],
    observations: quotation.observations || 'Sin observaciones',
  };

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logoImage = await loadImage(quotationLogoUrl);

  try {
    doc.addImage(logoImage, 'PNG', 424, 18, 150, 56);
  } catch {
    // Keep generating the PDF even if the logo cannot be rendered.
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 36;
  const marginRight = 36;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const boxWidth = contentWidth;
  const labelColor = 92;
  const accentColor = 162;
  const softFill = 248;
  const tableTop = 220;

  doc.setFontSize(20);
  doc.setTextColor(140, 24, 24);
  doc.text('Cotización', marginLeft, 36);

  doc.setFontSize(10);
  doc.setTextColor(labelColor);
  doc.text('Información general', marginLeft, 58);

  doc.setDrawColor(accentColor);
  doc.setFillColor(softFill, softFill, softFill);
  doc.roundedRect(marginLeft, 66, boxWidth - 190, 72, 6, 6, 'FD');

  const infoLines = [
    `Número: ${safeQuotation.id}`,
    `Cliente: ${safeQuotation.client}`,
    `Responsable: ${safeQuotation.responsible}`,
    `Vigencia: ${safeQuotation.validity}`,
  ];

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(infoLines, marginLeft + 14, 86, { maxWidth: boxWidth - 220, lineHeightFactor: 1.25 });

  doc.setFontSize(10);
  doc.setTextColor(labelColor);
  doc.text('Detalle de ítems', marginLeft, tableTop - 12);

  const tableX = marginLeft;
  const tableWidth = contentWidth;
  const conceptWidth = 280;
  const quantityWidth = 80;
  const headerHeight = 24;
  const rowPadding = 8;
  const rowStartY = tableTop;

  doc.setFillColor(220, 44, 44);
  doc.setDrawColor(220, 44, 44);
  doc.rect(tableX, rowStartY, tableWidth, headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('Concepto', tableX + 10, rowStartY + 16);
  doc.text('Cantidad', tableX + conceptWidth + 10, rowStartY + 16);
  doc.text('Valor total por item', tableX + conceptWidth + quantityWidth + 10, rowStartY + 16);

  doc.setTextColor(30, 30, 30);
  let currentY = rowStartY + headerHeight;

  safeQuotation.items.forEach((item, index) => {
    const conceptLines = doc.splitTextToSize(item.concept, conceptWidth - 20);
    const rowHeight = Math.max(24, conceptLines.length * 12 + rowPadding * 2);
    const fillColor = index % 2 === 0 ? 252 : 247;

    doc.setFillColor(fillColor, fillColor, fillColor);
    doc.setDrawColor(220, 220, 220);
    doc.rect(tableX, currentY, tableWidth, rowHeight, 'FD');

    doc.setDrawColor(220, 220, 220);
    doc.line(tableX + conceptWidth, currentY, tableX + conceptWidth, currentY + rowHeight);
    doc.line(tableX + conceptWidth + quantityWidth, currentY, tableX + conceptWidth + quantityWidth, currentY + rowHeight);

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(conceptLines, tableX + 10, currentY + 14, { maxWidth: conceptWidth - 20, lineHeightFactor: 1.15 });
    doc.text(String(item.quantity), tableX + conceptWidth + 10, currentY + 14);
    doc.text(money(item.total), tableX + conceptWidth + quantityWidth + 10, currentY + 14);

    currentY += rowHeight;
  });

  const totalBoxY = currentY + 14;
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(marginLeft, totalBoxY, boxWidth, 34, 6, 6, 'FD');
  doc.setFontSize(12);
  doc.setTextColor(140, 24, 24);
  doc.text(`Valor total de la cotización: ${money(safeQuotation.total)}`, marginLeft + 12, totalBoxY + 22);

  const observationLabelY = totalBoxY + 56;
  const observationLines = doc.splitTextToSize(safeQuotation.observations, boxWidth - 24);
  const observationBoxHeight = Math.max(56, observationLines.length * 12 + 20);

  doc.setFontSize(10);
  doc.setTextColor(labelColor);
  doc.text('Observaciones', marginLeft, observationLabelY);
  doc.setDrawColor(accentColor);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginLeft, observationLabelY + 8, boxWidth, observationBoxHeight, 6, 6, 'S');

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(observationLines, marginLeft + 12, observationLabelY + 28, { maxWidth: boxWidth - 24, lineHeightFactor: 1.25 });

  const signatureY = observationLabelY + 8 + observationBoxHeight + 90;
  doc.setDrawColor(140, 24, 24);
  doc.line(pageWidth - 210, signatureY, pageWidth - 50, signatureY);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Lorcy Mercado', pageWidth - 160, signatureY - 8);
  doc.text('Administración Conares de Caribe', pageWidth - 210, signatureY + 16);

  try {
    const blob = doc.output('blob');
    if (blob instanceof Blob) {
      triggerDownload(blob, `cotizacion-${safeQuotation.id}.pdf`);
    } else {
      doc.save(`cotizacion-${safeQuotation.id}.pdf`);
    }
  } catch {
    doc.save(`cotizacion-${safeQuotation.id}.pdf`);
  }
};

export const downloadProjectPdf = async (
  project: Project,
  trackingDrafts?: Record<string, { trackingNote?: string }>,
) => {
  const safeProject = {
    ...project,
    items: project.items ?? [],
  };

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logoImage = await loadImage(quotationLogoUrl);

  try {
    doc.addImage(logoImage, 'PNG', 424, 18, 150, 56);
  } catch {
    // Keep generating the PDF even if the logo cannot be rendered.
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 36;
  const marginRight = 36;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const boxWidth = contentWidth;
  const labelColor = 92;
  const accentColor = 162;
  const softFill = 248;
  const tableTop = 230;

  doc.setFontSize(20);
  doc.setTextColor(140, 24, 24);
  doc.text('Resumen de Proyecto', marginLeft, 36);

  doc.setFontSize(10);
  doc.setTextColor(labelColor);
  doc.text('Información general', marginLeft, 58);

  doc.setDrawColor(accentColor);
  doc.setFillColor(softFill, softFill, softFill);
  doc.roundedRect(marginLeft, 66, boxWidth - 190, 84, 6, 6, 'FD');

  doc.setDrawColor(accentColor);
  doc.setFillColor(255, 245, 245);
  doc.roundedRect(pageWidth - 176, 66, 140, 84, 6, 6, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(labelColor);
  doc.text('Estado', pageWidth - 164, 84);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(safeProject.status, pageWidth - 164, 100);
  doc.setFontSize(10);
  doc.setTextColor(labelColor);
  doc.text('Avance', pageWidth - 164, 120);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(`${safeProject.progress}%`, pageWidth - 164, 136);

  const infoLines = [
    `Código: ${safeProject.code}`,
    `Proyecto: ${safeProject.name}`,
    `Cliente: ${safeProject.client}`,
    `Responsable: ${safeProject.responsible}`,
    `Fechas: ${safeProject.startDate} al ${safeProject.endDate}`,
  ];

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(infoLines, marginLeft + 14, 84, { maxWidth: boxWidth - 220, lineHeightFactor: 1.25 });

  doc.setFontSize(10);
  doc.setTextColor(labelColor);
  doc.text('Avance y bitácora de ítems', marginLeft, tableTop - 12);

  const tableX = marginLeft;
  const tableWidth = contentWidth;
  const conceptWidth = 180;
  const progressWidth = 65;
  const statusWidth = 110;
  const bitacoraWidth = tableWidth - conceptWidth - progressWidth - statusWidth;
  const headerHeight = 24;
  const rowPadding = 8;
  const rowStartY = tableTop;

  doc.setFillColor(220, 44, 44);
  doc.setDrawColor(220, 44, 44);
  doc.rect(tableX, rowStartY, tableWidth, headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('Concepto', tableX + 8, rowStartY + 16);
  doc.text('Progreso', tableX + conceptWidth + 8, rowStartY + 16);
  doc.text('Estado', tableX + conceptWidth + progressWidth + 8, rowStartY + 16);
  doc.text('Bitácora / Novedad de seguimiento', tableX + conceptWidth + progressWidth + statusWidth + 8, rowStartY + 16);

  doc.setTextColor(30, 30, 30);
  let currentY = rowStartY + headerHeight;

  safeProject.items.forEach((item, index) => {
    const conceptLines = doc.splitTextToSize(item.concept, conceptWidth - 16);
    const trackingDraft = trackingDrafts?.[item.id]?.trackingNote?.trim() ?? '';
    const recentHistory = item.history && item.history.length > 0
      ? item.history.slice(-2).join(' | ')
      : '';
    const historyText = trackingDraft
      ? `Novedad actual: ${trackingDraft}${recentHistory ? ` | Historial: ${recentHistory}` : ''}`
      : recentHistory || 'Sin novedades registradas';
    const bitacoraLines = doc.splitTextToSize(historyText, bitacoraWidth - 16);
    const maxLines = Math.max(conceptLines.length, bitacoraLines.length);
    const rowHeight = Math.max(26, maxLines * 12 + rowPadding * 2);
    const fillColor = index % 2 === 0 ? 252 : 247;

    doc.setFillColor(fillColor, fillColor, fillColor);
    doc.setDrawColor(220, 220, 220);
    doc.rect(tableX, currentY, tableWidth, rowHeight, 'FD');

    doc.setDrawColor(220, 220, 220);
    doc.line(tableX + conceptWidth, currentY, tableX + conceptWidth, currentY + rowHeight);
    doc.line(tableX + conceptWidth + progressWidth, currentY, tableX + conceptWidth + progressWidth, currentY + rowHeight);
    doc.line(tableX + conceptWidth + progressWidth + statusWidth, currentY, tableX + conceptWidth + progressWidth + statusWidth, currentY + rowHeight);

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(conceptLines, tableX + 8, currentY + 15, { maxWidth: conceptWidth - 16, lineHeightFactor: 1.15 });
    doc.text(`${item.progress}%`, tableX + conceptWidth + 8, currentY + 15);
    doc.text(item.status, tableX + conceptWidth + progressWidth + 8, currentY + 15);
    doc.text(bitacoraLines, tableX + conceptWidth + progressWidth + statusWidth + 8, currentY + 15, { maxWidth: bitacoraWidth - 16, lineHeightFactor: 1.15 });

    currentY += rowHeight;
  });

  const totalBoxY = currentY + 14;
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(marginLeft, totalBoxY, boxWidth, 34, 6, 6, 'FD');
  doc.setFontSize(11);
  doc.setTextColor(140, 24, 24);
  doc.text(`Avance general del proyecto: ${safeProject.progress}% | Actividades pendientes: ${safeProject.pendingActivities}`, marginLeft + 12, totalBoxY + 22);

  const signatureY = totalBoxY + 90;
  doc.setDrawColor(140, 24, 24);
  doc.line(pageWidth - 210, signatureY, pageWidth - 50, signatureY);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('Administración Conares de Caribe', pageWidth - 210, signatureY + 16);

  try {
    const blob = doc.output('blob');
    if (blob instanceof Blob) {
      triggerDownload(blob, `proyecto-${safeProject.code || safeProject.id}.pdf`);
    } else {
      doc.save(`proyecto-${safeProject.code || safeProject.id}.pdf`);
    }
  } catch {
    doc.save(`proyecto-${safeProject.code || safeProject.id}.pdf`);
  }
};
