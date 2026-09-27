import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { generateInvoiceNumber, paginationParams, buildPaginationMeta } from '../utils/helpers';
import { logActivity } from '../utils/activityLogger';
import { generateInvoicePDF } from '../services/pdfService';

export const invoiceRoutes = Router();
invoiceRoutes.use(authenticate);

const calcInvoiceTotals = (body: Record<string, unknown>) => {
  const subtotal = parseFloat(String(body.subtotal || 0));
  const vatRate = parseFloat(String(body.vatRate ?? 15));
  const discount = parseFloat(String(body.discount || 0));
  const vatAmount = (subtotal - discount) * (vatRate / 100);
  const grandTotal = subtotal - discount + vatAmount;
  return { subtotal, vatRate, discount, vatAmount, grandTotal, balance: grandTotal };
};

invoiceRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, status, customerId } = req.query as Record<string, string>;
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (q) where.OR = [{ invoiceNumber: { contains: q, mode: 'insensitive' } }, { customer: { companyName: { contains: q, mode: 'insensitive' } } }];
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { customer: { select: { companyName: true, customerId: true } }, shipment: { select: { shipmentNumber: true } } } }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ success: true, data: invoices, pagination: buildPaginationMeta(total, page, limit) });
}));

invoiceRoutes.post('/', authorize('ADMIN', 'MANAGER', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { customerId, shipmentId, dueDate, notes, currency, items } = req.body;
  if (!customerId) throw createError('Customer is required.', 400);
  const count = await prisma.invoice.count();
  const invoiceNumber = generateInvoiceNumber(count + 1);
  const itemsArray = Array.isArray(items) ? items : [];
  const subtotal = itemsArray.reduce((sum: number, item: Record<string, unknown>) => sum + parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0)), 0);
  const totals = calcInvoiceTotals({ ...req.body, subtotal });
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber, customerId, shipmentId: shipmentId || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined, notes, currency: currency || 'SAR', ...totals, paidAmount: 0,
      items: { create: itemsArray.map((item: Record<string, unknown>, i: number) => ({ description: String(item.description || ''), quantity: parseFloat(String(item.quantity || 1)), unitPrice: parseFloat(String(item.unitPrice || 0)), total: parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0)), sortOrder: i })) },
    },
    include: { customer: true, items: true },
  });
  await logActivity({ userId: req.user!.id, action: 'CREATE_INVOICE', entity: 'invoice', entityId: invoice.id, description: `Created invoice ${invoiceNumber}` });
  res.status(201).json({ success: true, data: invoice });
}));

invoiceRoutes.get('/:id', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { customer: true, shipment: { select: { shipmentNumber: true, origin: true, destination: true } }, items: { orderBy: { sortOrder: 'asc' } } } });
  if (!invoice) throw createError('Invoice not found.', 404);
  res.json({ success: true, data: invoice });
}));

invoiceRoutes.put('/:id', authorize('ADMIN', 'MANAGER', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Invoice not found.', 404);
  if (existing.status !== 'DRAFT') throw createError('Only DRAFT invoices can be edited.', 400);
  const { dueDate, notes, items } = req.body;
  const itemsArray = Array.isArray(items) ? items : [];
  const subtotal = itemsArray.reduce((sum: number, item: Record<string, unknown>) => sum + parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0)), 0);
  const totals = calcInvoiceTotals({ ...req.body, subtotal });
  if (items) await prisma.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { dueDate: dueDate ? new Date(dueDate) : undefined, notes, ...totals, paidAmount: existing.paidAmount, balance: totals.grandTotal - existing.paidAmount, items: items ? { create: itemsArray.map((item: Record<string, unknown>, i: number) => ({ description: String(item.description || ''), quantity: parseFloat(String(item.quantity || 1)), unitPrice: parseFloat(String(item.unitPrice || 0)), total: parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0)), sortOrder: i })) } : undefined },
    include: { customer: true, items: true },
  });
  res.json({ success: true, data: invoice });
}));

invoiceRoutes.delete('/:id', authorize('ADMIN', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Invoice not found.', 404);
  if (existing.status !== 'DRAFT') throw createError('Only DRAFT invoices can be deleted.', 400);
  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Invoice deleted.' });
}));

invoiceRoutes.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, paymentAmount } = req.body as { status: string; paymentAmount?: number };
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Invoice not found.', 404);
  const updateData: Record<string, unknown> = { status };
  if (paymentAmount && paymentAmount > 0) {
    const newPaid = existing.paidAmount + paymentAmount;
    const newBalance = existing.grandTotal - newPaid;
    updateData.paidAmount = newPaid;
    updateData.balance = newBalance;
    updateData.status = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    if (newBalance <= 0) updateData.paidAt = new Date();
  }
  if (status === 'SENT') updateData.sentAt = new Date();
  await prisma.invoice.update({ where: { id: req.params.id }, data: updateData as Parameters<typeof prisma.invoice.update>[0]['data'] });
  res.json({ success: true, message: 'Invoice updated.' });
}));

invoiceRoutes.get('/:id/pdf', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { customer: true, shipment: true, items: { orderBy: { sortOrder: 'asc' } } } });
  if (!invoice) throw createError('Invoice not found.', 404);
  const pdfBuffer = generateInvoicePDF(invoice, invoice.customer, invoice.items, invoice.shipment || undefined);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
  res.send(pdfBuffer);
}));

invoiceRoutes.post('/:id/send', authorize('ADMIN', 'MANAGER', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Invoice not found.', 404);
  await prisma.invoice.update({ where: { id: req.params.id }, data: { status: 'SENT', sentAt: new Date() } });
  await logActivity({ userId: req.user!.id, action: 'SEND_INVOICE', entity: 'invoice', entityId: req.params.id, description: `Sent invoice ${existing.invoiceNumber}` });
  res.json({ success: true, message: 'Invoice marked as sent.' });
}));
