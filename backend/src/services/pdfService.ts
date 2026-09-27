import PDFDocument from 'pdfkit';

const NAVY = '#1E1B4B';
const MAGENTA = '#C026D3';
const GRAY = '#64748B';
const LIGHT_GRAY = '#F1F5F9';

const drawHeader = (doc: PDFKit.PDFDocument) => {
  doc.rect(0, 0, doc.page.width, 80).fill(NAVY);
  doc.fontSize(20).fillColor('white').font('Helvetica-Bold').text('KREATIV ICON', 40, 20);
  doc.fontSize(9).fillColor(MAGENTA).font('Helvetica').text('Moving Your Business Forward', 40, 44);
  doc.fontSize(8).fillColor('#CBD5E1').text('Riyadh, Kingdom of Saudi Arabia | www.kreativicon.com', 40, 58);
  doc.fillColor('black');
};

const drawFooter = (doc: PDFKit.PDFDocument) => {
  const y = doc.page.height - 50;
  doc.rect(0, y, doc.page.width, 50).fill(NAVY);
  doc.fontSize(8).fillColor('white').font('Helvetica').text('Kreativ Icon Company | www.kreativicon.com | info@kreativicon.com', 40, y + 18, { align: 'center', width: doc.page.width - 80 });
  doc.fillColor('black');
};

const drawSectionTitle = (doc: PDFKit.PDFDocument, title: string, y: number) => {
  doc.rect(40, y, doc.page.width - 80, 22).fill(LIGHT_GRAY);
  doc.fontSize(10).fillColor(NAVY).font('Helvetica-Bold').text(title, 48, y + 6);
  doc.fillColor('black');
  return y + 30;
};

export const generateQuotationPDF = (quotation: Record<string, unknown>, customer: Record<string, unknown>, items: Record<string, unknown>[]): Buffer => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  drawHeader(doc);

  // Title
  doc.moveDown(3);
  doc.fontSize(18).fillColor(NAVY).font('Helvetica-Bold').text('QUOTATION', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(MAGENTA).text(`${quotation.quotationNumber}`, { align: 'center' });
  doc.moveDown(1);

  // Info row
  let y = doc.y;
  y = drawSectionTitle(doc, 'Quotation Details', y);
  const col1 = 40, col2 = 200, col3 = 360, col4 = 480;
  doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold');
  doc.text('Quotation No:', col1, y); doc.text('Date:', col2, y); doc.text('Valid Until:', col3, y);
  doc.font('Helvetica').fillColor('black');
  doc.text(String(quotation.quotationNumber || ''), col1, y + 14);
  doc.text(new Date().toLocaleDateString('en-GB'), col2, y + 14);
  doc.text(quotation.validUntil ? new Date(quotation.validUntil as string).toLocaleDateString('en-GB') : 'N/A', col3, y + 14);
  y += 40;

  // Customer
  y = drawSectionTitle(doc, 'Customer Information', y);
  doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('Company:', col1, y);
  doc.font('Helvetica').fillColor('black').text(String(customer.companyName || ''), col2, y);
  doc.fillColor(GRAY).font('Helvetica-Bold').text('Contact:', col3, y);
  doc.font('Helvetica').fillColor('black').text(String(customer.contactPerson || 'N/A'), col4, y);
  y += 18;
  doc.fillColor(GRAY).font('Helvetica-Bold').text('Email:', col1, y);
  doc.font('Helvetica').fillColor('black').text(String(customer.email || 'N/A'), col2, y);
  y += 30;

  // Shipment info
  if (quotation.origin || quotation.destination) {
    y = drawSectionTitle(doc, 'Shipment Information', y);
    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('Origin:', col1, y); doc.font('Helvetica').fillColor('black').text(String(quotation.origin || ''), col2, y);
    doc.fillColor(GRAY).font('Helvetica-Bold').text('Destination:', col3, y); doc.font('Helvetica').fillColor('black').text(String(quotation.destination || ''), col4, y);
    y += 18;
    doc.fillColor(GRAY).font('Helvetica-Bold').text('Service:', col1, y); doc.font('Helvetica').fillColor('black').text(String(quotation.serviceType || '').replace(/_/g, ' '), col2, y);
    if (quotation.weight) { doc.fillColor(GRAY).font('Helvetica-Bold').text('Weight:', col3, y); doc.font('Helvetica').fillColor('black').text(`${quotation.weight} KG`, col4, y); }
    y += 30;
  }

  // Items table (if any)
  if (items && items.length > 0) {
    y = drawSectionTitle(doc, 'Line Items', y);
    doc.rect(40, y, doc.page.width - 80, 20).fill(NAVY);
    doc.fontSize(9).fillColor('white').font('Helvetica-Bold');
    doc.text('Description', 48, y + 6, { width: 240 }); doc.text('Qty', 295, y + 6, { width: 50, align: 'right' }); doc.text('Unit Price (SAR)', 350, y + 6, { width: 100, align: 'right' }); doc.text('Total (SAR)', 455, y + 6, { width: 80, align: 'right' });
    y += 22;
    items.forEach((item, i) => {
      doc.rect(40, y, doc.page.width - 80, 18).fill(i % 2 === 0 ? 'white' : LIGHT_GRAY);
      doc.fillColor('black').font('Helvetica').fontSize(9);
      doc.text(String(item.description || ''), 48, y + 4, { width: 240 }); doc.text(String(item.quantity || 1), 295, y + 4, { width: 50, align: 'right' }); doc.text(Number(item.unitPrice || 0).toFixed(2), 350, y + 4, { width: 100, align: 'right' }); doc.text(Number(item.total || 0).toFixed(2), 455, y + 4, { width: 80, align: 'right' });
      y += 20;
    });
    y += 10;
  }

  // Charges summary
  y = drawSectionTitle(doc, 'Pricing Summary', y);
  const charges = [['Freight Charges', quotation.freightCharges], ['Customs Charges', quotation.customsCharges], ['Transport Charges', quotation.transportCharges], ['Handling Charges', quotation.handlingCharges], ['Other Charges', quotation.otherCharges]].filter(([, v]) => Number(v) > 0);
  charges.forEach(([label, value]) => { doc.fontSize(9).fillColor(GRAY).text(String(label), 320, y); doc.fillColor('black').text(`SAR ${Number(value).toFixed(2)}`, 470, y, { align: 'right', width: 80 }); y += 16; });
  doc.moveTo(320, y).lineTo(560, y).stroke(LIGHT_GRAY); y += 8;
  doc.font('Helvetica').text('Subtotal:', 320, y); doc.text(`SAR ${Number(quotation.subtotal || 0).toFixed(2)}`, 470, y, { align: 'right', width: 80 }); y += 16;
  if (Number(quotation.discount) > 0) { doc.fillColor(MAGENTA).text(`Discount:`, 320, y); doc.text(`- SAR ${Number(quotation.discount).toFixed(2)}`, 470, y, { align: 'right', width: 80 }); doc.fillColor('black'); y += 16; }
  doc.text(`VAT (${quotation.vatRate}%):`, 320, y); doc.text(`SAR ${Number(quotation.vatAmount || 0).toFixed(2)}`, 470, y, { align: 'right', width: 80 }); y += 10;
  doc.rect(310, y, 260, 24).fill(NAVY);
  doc.fontSize(11).fillColor('white').font('Helvetica-Bold').text('GRAND TOTAL:', 320, y + 6); doc.text(`SAR ${Number(quotation.grandTotal || 0).toFixed(2)}`, 470, y + 6, { align: 'right', width: 80 }); y += 34; doc.fillColor('black');

  // Terms
  if (quotation.termsConditions) { y = drawSectionTitle(doc, 'Terms & Conditions', y); doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(String(quotation.termsConditions), 40, y, { width: doc.page.width - 80 }); }

  drawFooter(doc);
  doc.end();
  return Buffer.concat(buffers);
};

export const generateInvoicePDF = (invoice: Record<string, unknown>, customer: Record<string, unknown>, items: Record<string, unknown>[], shipment?: Record<string, unknown> | null): Buffer => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  drawHeader(doc);
  doc.moveDown(3);
  doc.fontSize(18).fillColor(NAVY).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(MAGENTA).text(`${invoice.invoiceNumber}`, { align: 'center' });
  doc.moveDown(1);

  let y = doc.y;
  y = drawSectionTitle(doc, 'Invoice Details', y);
  const col1 = 40, col2 = 200, col3 = 360, col4 = 460;
  doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold');
  doc.text('Invoice No:', col1, y); doc.text('Invoice Date:', col2, y); doc.text('Due Date:', col3, y);
  doc.font('Helvetica').fillColor('black');
  doc.text(String(invoice.invoiceNumber || ''), col1, y + 14);
  doc.text(invoice.invoiceDate ? new Date(invoice.invoiceDate as string).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'), col2, y + 14);
  doc.text(invoice.dueDate ? new Date(invoice.dueDate as string).toLocaleDateString('en-GB') : 'N/A', col3, y + 14);
  y += 40;

  y = drawSectionTitle(doc, 'Bill To', y);
  doc.fontSize(10).fillColor(NAVY).font('Helvetica-Bold').text(String(customer.companyName || ''), col1, y);
  doc.fontSize(9).fillColor(GRAY).font('Helvetica');
  if (customer.contactPerson) doc.text(String(customer.contactPerson), col1, y + 14);
  if (customer.email) doc.text(String(customer.email), col1, y + 28);
  if (customer.vatNumber) doc.text(`VAT: ${customer.vatNumber}`, col1, y + 42);
  y += 70;

  if (shipment) {
    y = drawSectionTitle(doc, 'Shipment Reference', y);
    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('Shipment No:', col1, y); doc.font('Helvetica').fillColor('black').text(String((shipment as Record<string, unknown>).shipmentNumber || ''), col2, y);
    if ((shipment as Record<string, unknown>).origin) { doc.fillColor(GRAY).font('Helvetica-Bold').text('Route:', col3, y); doc.font('Helvetica').fillColor('black').text(`${(shipment as Record<string, unknown>).origin} → ${(shipment as Record<string, unknown>).destination}`, col4, y); }
    y += 30;
  }

  // Items table
  y = drawSectionTitle(doc, 'Invoice Items', y);
  doc.rect(40, y, doc.page.width - 80, 20).fill(NAVY);
  doc.fontSize(9).fillColor('white').font('Helvetica-Bold');
  doc.text('Description', 48, y + 6, { width: 240 }); doc.text('Qty', 295, y + 6, { width: 50, align: 'right' }); doc.text('Unit Price', 350, y + 6, { width: 100, align: 'right' }); doc.text('Total (SAR)', 455, y + 6, { width: 80, align: 'right' });
  y += 22;
  items.forEach((item, i) => {
    doc.rect(40, y, doc.page.width - 80, 18).fill(i % 2 === 0 ? 'white' : LIGHT_GRAY);
    doc.fillColor('black').font('Helvetica').fontSize(9);
    doc.text(String(item.description || ''), 48, y + 4, { width: 240 }); doc.text(String(item.quantity || 1), 295, y + 4, { width: 50, align: 'right' }); doc.text(Number(item.unitPrice || 0).toFixed(2), 350, y + 4, { width: 100, align: 'right' }); doc.text(Number(item.total || 0).toFixed(2), 455, y + 4, { width: 80, align: 'right' });
    y += 20;
  });
  y += 10;

  // Totals
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('Subtotal:', 320, y); doc.fillColor('black').text(`SAR ${Number(invoice.subtotal || 0).toFixed(2)}`, 470, y, { align: 'right', width: 80 }); y += 16;
  if (Number(invoice.discount) > 0) { doc.fillColor(MAGENTA).text('Discount:', 320, y); doc.text(`- SAR ${Number(invoice.discount).toFixed(2)}`, 470, y, { align: 'right', width: 80 }); doc.fillColor('black'); y += 16; }
  doc.fillColor(GRAY).text(`VAT (${invoice.vatRate}%):`, 320, y); doc.fillColor('black').text(`SAR ${Number(invoice.vatAmount || 0).toFixed(2)}`, 470, y, { align: 'right', width: 80 }); y += 10;
  doc.rect(310, y, 260, 24).fill(NAVY);
  doc.fontSize(11).fillColor('white').font('Helvetica-Bold').text('GRAND TOTAL:', 320, y + 6); doc.text(`SAR ${Number(invoice.grandTotal || 0).toFixed(2)}`, 470, y + 6, { align: 'right', width: 80 }); y += 34; doc.fillColor('black');

  if (Number(invoice.paidAmount) > 0) { doc.fontSize(9).fillColor(GRAY).font('Helvetica').text('Paid Amount:', 320, y); doc.fillColor('black').text(`SAR ${Number(invoice.paidAmount).toFixed(2)}`, 470, y, { align: 'right', width: 80 }); y += 16; doc.rect(310, y, 260, 24).fill(MAGENTA); doc.fontSize(11).fillColor('white').font('Helvetica-Bold').text('BALANCE DUE:', 320, y + 6); doc.text(`SAR ${Number(invoice.balance || 0).toFixed(2)}`, 470, y + 6, { align: 'right', width: 80 }); y += 34; doc.fillColor('black'); }

  if (invoice.notes) { y = drawSectionTitle(doc, 'Notes', y); doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(String(invoice.notes), 40, y, { width: doc.page.width - 80 }); }

  drawFooter(doc);
  doc.end();
  return Buffer.concat(buffers);
};
