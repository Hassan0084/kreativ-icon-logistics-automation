import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { paginationParams, buildPaginationMeta } from '../utils/helpers';

export const expenseRoutes = Router();
expenseRoutes.use(authenticate);

expenseRoutes.get('/summary', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { startDate, endDate } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) (where.expenseDate as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.expenseDate as Record<string, unknown>).lte = new Date(endDate);
  }
  const [byCategory, total] = await Promise.all([
    prisma.expense.groupBy({ by: ['category'], _sum: { amountInSAR: true }, where }),
    prisma.expense.aggregate({ _sum: { amountInSAR: true }, where }),
  ]);
  res.json({ success: true, data: { byCategory: byCategory.map(r => ({ category: r.category, total: r._sum.amountInSAR || 0 })), totalAmount: total._sum.amountInSAR || 0 } });
}));

expenseRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { shipmentId, category, startDate, endDate } = req.query as Record<string, string>;
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const where: Record<string, unknown> = {};
  if (shipmentId) where.shipmentId = shipmentId;
  if (category) where.category = category;
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) (where.expenseDate as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.expenseDate as Record<string, unknown>).lte = new Date(endDate);
  }
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where, skip, take, orderBy: { expenseDate: 'desc' }, include: { shipment: { select: { shipmentNumber: true } } } }),
    prisma.expense.count({ where }),
  ]);
  res.json({ success: true, data: expenses, pagination: buildPaginationMeta(total, page, limit) });
}));

expenseRoutes.post('/', authorize('ADMIN', 'MANAGER', 'OPERATIONS', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { shipmentId, vendor, category, description, amount, currency, exchangeRate, expenseDate, paymentMethod, notes } = req.body;
  if (!description) throw createError('Description is required.', 400);
  if (!amount) throw createError('Amount is required.', 400);
  const amt = parseFloat(amount);
  const rate = parseFloat(exchangeRate || '1');
  const amountInSAR = amt * rate;
  const expense = await prisma.expense.create({
    data: { shipmentId: shipmentId || undefined, vendor, category: category || 'OTHER', description, amount: amt, currency: currency || 'SAR', exchangeRate: rate, amountInSAR, expenseDate: expenseDate ? new Date(expenseDate) : new Date(), paymentMethod, notes },
  });
  res.status(201).json({ success: true, data: expense });
}));

expenseRoutes.get('/:id', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.id }, include: { shipment: { select: { shipmentNumber: true } } } });
  if (!expense) throw createError('Expense not found.', 404);
  res.json({ success: true, data: expense });
}));

expenseRoutes.put('/:id', authorize('ADMIN', 'MANAGER', 'OPERATIONS', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Expense not found.', 404);
  const { vendor, category, description, amount, currency, exchangeRate, expenseDate, paymentMethod, notes } = req.body;
  const amt = amount ? parseFloat(amount) : existing.amount;
  const rate = exchangeRate ? parseFloat(exchangeRate) : existing.exchangeRate;
  const expense = await prisma.expense.update({ where: { id: req.params.id }, data: { vendor, category, description, amount: amt, currency, exchangeRate: rate, amountInSAR: amt * rate, expenseDate: expenseDate ? new Date(expenseDate) : undefined, paymentMethod, notes } });
  res.json({ success: true, data: expense });
}));

expenseRoutes.delete('/:id', authorize('ADMIN', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Expense not found.', 404);
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Expense deleted.' });
}));
