import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { generateQuotationNumber, paginationParams, buildPaginationMeta } from '../utils/helpers';
import { logActivity } from '../utils/activityLogger';
import { generateQuotationPDF } from '../services/pdfService';

export const quotationRoutes = Router();
quotationRoutes.use(authenticate);

const calcTotals = (body: Record<string, unknown>) => {
  const freight = parseFloat(String(body.freightCharges || 0));
  const customs = parseFloat(String(body.customsCharges || 0));
  const transport = parseFloat(String(body.transportCharges || 0));
  const handling = parseFloat(String(body.handlingCharges || 0));
  const other = parseFloat(String(body.otherCharges || 0));
  const discount = parseFloat(String(body.discount || 0));
  const vatRate = parseFloat(String(body.vatRate ?? 15));
  const subtotal = freight + customs + transport + handling + other;
  const vatAmount = (subtotal - discount) * (vatRate / 100);
  const grandTotal = subtotal - discount + vatAmount;
  return { subtotal, discount, vatRate, vatAmount, grandTotal, freightCharges: freight, customsCharges: customs, transportCharges: transport, handlingCharges: handling, otherCharges: other };
};

quotationRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, status, customerId } = req.query as Record<string, string>;
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (q) where.OR = [{ quotationNumber: { contains: q, mode: 'insensitive' } }, { customer: { companyName: { contains: q, mode: 'insensitive' } } }];
  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { customer: { select: { companyName: true, customerId: true } } } }),
    prisma.quotation.count({ where }),
  ]);
  res.json({ success: true, data: quotations, pagination: buildPaginationMeta(total, page, limit) });
}));

quotationRoutes.post('/', authorize('ADMIN', 'MANAGER', 'SALES'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { customerId, origin, destination, serviceType, cargoDescription, weight, volume, validUntil, termsConditions, notes, items } = req.body;
  if (!customerId) throw createError('Customer is required.', 400);
  const count = await prisma.quotation.count();
  const quotationNumber = generateQuotationNumber(count + 1);
  const totals = calcTotals(req.body);
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber, customerId, origin, destination, serviceType, cargoDescription,
      weight: weight ? parseFloat(weight) : undefined, volume: volume ? parseFloat(volume) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined, termsConditions, notes, ...totals,
      items: items?.length ? { create: items.map((item: Record<string, unknown>, i: number) => ({ description: String(item.description), quantity: parseFloat(String(item.quantity || 1)), unitPrice: parseFloat(String(item.unitPrice || 0)), total: parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0)), sortOrder: i })) } : undefined,
    },
    include: { customer: true, items: true },
  });
  await logActivity({ userId: req.user!.id, action: 'CREATE_QUOTATION', entity: 'quotation', entityId: quotation.id, description: `Created quotation ${quotationNumber}` });
  res.status(201).json({ success: true, data: quotation });
}));

quotationRoutes.get('/:id', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const q = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { customer: true, items: { orderBy: { sortOrder: 'asc' } } } });
  if (!q) throw createError('Quotation not found.', 404);
  res.json({ success: true, data: q });
}));

quotationRoutes.put('/:id', authorize('ADMIN', 'MANAGER', 'SALES'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Quotation not found.', 404);
  const { origin, destination, serviceType, cargoDescription, weight, volume, validUntil, termsConditions, notes, items } = req.body;
  const totals = calcTotals(req.body);
  if (items) await prisma.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
  const quotation = await prisma.quotation.update({
    where: { id: req.params.id },
    data: {
      origin, destination, serviceType, cargoDescription,
      weight: weight ? parseFloat(weight) : undefined, volume: volume ? parseFloat(volume) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined, termsConditions, notes, ...totals,
      items: items?.length ? { create: items.map((item: Record<string, unknown>, i: number) => ({ description: String(item.description), quantity: parseFloat(String(item.quantity || 1)), unitPrice: parseFloat(String(item.unitPrice || 0)), total: parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0)), sortOrder: i })) } : undefined,
    },
    include: { customer: true, items: { orderBy: { sortOrder: 'asc' } } },
  });
  res.json({ success: true, data: quotation });
}));

quotationRoutes.delete('/:id', authorize('ADMIN', 'MANAGER'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Quotation not found.', 404);
  if (existing.status !== 'DRAFT') throw createError('Only DRAFT quotations can be deleted.', 400);
  await prisma.quotation.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Quotation deleted.' });
}));

quotationRoutes.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'SALES'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body as { status: string };
  const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Quotation not found.', 404);
  const updateData: Record<string, unknown> = { status };
  if (status === 'SENT') updateData.sentAt = new Date();
  if (status === 'ACCEPTED') updateData.acceptedAt = new Date();
  if (status === 'REJECTED') updateData.rejectedAt = new Date();
  await prisma.quotation.update({ where: { id: req.params.id }, data: updateData as Parameters<typeof prisma.quotation.update>[0]['data'] });
  res.json({ success: true, message: `Quotation status updated to ${status}.` });
}));

quotationRoutes.get('/:id/pdf', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { customer: true, items: { orderBy: { sortOrder: 'asc' } } } });
  if (!quotation) throw createError('Quotation not found.', 404);
  const pdfBuffer = generateQuotationPDF(quotation, quotation.customer, quotation.items);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="quotation-${quotation.quotationNumber}.pdf"`);
  res.send(pdfBuffer);
}));

quotationRoutes.post('/:id/send', authorize('ADMIN', 'MANAGER', 'SALES'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.quotation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Quotation not found.', 404);
  await prisma.quotation.update({ where: { id: req.params.id }, data: { status: 'SENT', sentAt: new Date() } });
  await logActivity({ userId: req.user!.id, action: 'SEND_QUOTATION', entity: 'quotation', entityId: req.params.id, description: `Sent quotation ${existing.quotationNumber}` });
  res.json({ success: true, message: 'Quotation marked as sent.' });
}));
