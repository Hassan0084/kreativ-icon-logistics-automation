import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const reportRoutes = Router();
reportRoutes.use(authenticate);

const toCSV = (headers: string[], rows: Record<string, unknown>[]): string => {
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
};

const sendCSV = (res: Response, filename: string, headers: string[], rows: Record<string, unknown>[]) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCSV(headers, rows));
};

reportRoutes.get('/shipments', authorize('ADMIN', 'MANAGER', 'OPERATIONS', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { startDate, endDate, customerId, status, serviceType, format } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isActive: true };
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (serviceType) where.serviceType = serviceType;
  if (startDate || endDate) { where.createdAt = {}; if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate); if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate); }
  const shipments = await prisma.shipment.findMany({ where, orderBy: { createdAt: 'desc' }, include: { customer: { select: { companyName: true } }, carrier: { select: { companyName: true } } } });
  if (format === 'csv') {
    const headers = ['shipmentNumber', 'status', 'serviceType', 'origin', 'destination', 'customerName', 'carrierName', 'weight', 'sellingPrice', 'profit', 'eta', 'createdAt'];
    const rows = shipments.map(s => ({ shipmentNumber: s.shipmentNumber, status: s.status, serviceType: s.serviceType, origin: s.origin, destination: s.destination, customerName: s.customer.companyName, carrierName: s.carrier?.companyName || '', weight: s.weight || '', sellingPrice: s.sellingPrice || 0, profit: s.profit || 0, eta: s.eta?.toISOString().split('T')[0] || '', createdAt: s.createdAt.toISOString().split('T')[0] }));
    return sendCSV(res, 'shipments-report.csv', headers, rows);
  }
  res.json({ success: true, data: shipments, count: shipments.length });
}));

reportRoutes.get('/revenue', authorize('ADMIN', 'MANAGER', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { startDate, endDate } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { status: 'PAID' };
  if (startDate || endDate) { where.invoiceDate = {}; if (startDate) (where.invoiceDate as Record<string, unknown>).gte = new Date(startDate); if (endDate) (where.invoiceDate as Record<string, unknown>).lte = new Date(endDate); }
  const [monthly, total] = await Promise.all([
    prisma.$queryRaw<{ month: string; revenue: number; count: bigint }[]>`SELECT TO_CHAR(DATE_TRUNC('month',"invoiceDate"),'YYYY-MM') as month, COALESCE(SUM("grandTotal"),0) as revenue, COUNT(*) as count FROM invoices WHERE status='PAID' GROUP BY month ORDER BY month`,
    prisma.invoice.aggregate({ _sum: { grandTotal: true }, where }),
  ]);
  res.json({ success: true, data: { monthly: monthly.map(r => ({ month: r.month, revenue: Number(r.revenue), count: Number(r.count) })), totalRevenue: total._sum.grandTotal || 0 } });
}));

reportRoutes.get('/expenses', authorize('ADMIN', 'MANAGER', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { startDate, endDate, format } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (startDate || endDate) { where.expenseDate = {}; if (startDate) (where.expenseDate as Record<string, unknown>).gte = new Date(startDate); if (endDate) (where.expenseDate as Record<string, unknown>).lte = new Date(endDate); }
  const [byCategory, byMonth, total] = await Promise.all([
    prisma.expense.groupBy({ by: ['category'], _sum: { amountInSAR: true }, where }),
    prisma.$queryRaw<{ month: string; expenses: number }[]>`SELECT TO_CHAR(DATE_TRUNC('month',"expenseDate"),'YYYY-MM') as month, COALESCE(SUM("amountInSAR"),0) as expenses FROM expenses GROUP BY month ORDER BY month`,
    prisma.expense.aggregate({ _sum: { amountInSAR: true }, where }),
  ]);
  if (format === 'csv') {
    const expenses = await prisma.expense.findMany({ where, include: { shipment: { select: { shipmentNumber: true } } } });
    return sendCSV(res, 'expenses-report.csv', ['category', 'vendor', 'description', 'amount', 'currency', 'amountInSAR', 'shipmentNumber', 'expenseDate'], expenses.map(e => ({ category: e.category, vendor: e.vendor || '', description: e.description, amount: e.amount, currency: e.currency, amountInSAR: e.amountInSAR || 0, shipmentNumber: e.shipment?.shipmentNumber || '', expenseDate: e.expenseDate.toISOString().split('T')[0] })));
  }
  res.json({ success: true, data: { byCategory: byCategory.map(r => ({ category: r.category, total: r._sum.amountInSAR || 0 })), byMonth: byMonth.map(r => ({ month: r.month, expenses: Number(r.expenses) })), totalExpenses: total._sum.amountInSAR || 0 } });
}));

reportRoutes.get('/profit', authorize('ADMIN', 'MANAGER', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const revenue = await prisma.$queryRaw<{ month: string; revenue: number }[]>`SELECT TO_CHAR(DATE_TRUNC('month',"invoiceDate"),'YYYY-MM') as month, COALESCE(SUM("grandTotal"),0) as revenue FROM invoices WHERE status='PAID' GROUP BY month ORDER BY month`;
  const expenses = await prisma.$queryRaw<{ month: string; expenses: number }[]>`SELECT TO_CHAR(DATE_TRUNC('month',"expenseDate"),'YYYY-MM') as month, COALESCE(SUM("amountInSAR"),0) as expenses FROM expenses GROUP BY month ORDER BY month`;
  const expMap = new Map(expenses.map(e => [e.month, Number(e.expenses)]));
  const data = revenue.map(r => { const rev = Number(r.revenue); const exp = expMap.get(r.month) || 0; return { month: r.month, revenue: rev, expenses: exp, profit: rev - exp, margin: rev > 0 ? Math.round(((rev - exp) / rev) * 10000) / 100 : 0 }; });
  res.json({ success: true, data });
}));

reportRoutes.get('/customers', authorize('ADMIN', 'MANAGER', 'FINANCE'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const customers = await prisma.customer.findMany({ where: { isActive: true }, include: { _count: { select: { shipments: true, invoices: true } } }, orderBy: { companyName: 'asc' } });
  res.json({ success: true, data: customers });
}));

reportRoutes.get('/delivery-performance', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { startDate, endDate } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { status: 'DELIVERED', isActive: true };
  if (startDate || endDate) { where.actualDeliveryDate = {}; if (startDate) (where.actualDeliveryDate as Record<string, unknown>).gte = new Date(startDate); if (endDate) (where.actualDeliveryDate as Record<string, unknown>).lte = new Date(endDate); }
  const delivered = await prisma.shipment.findMany({ where, select: { id: true, shipmentNumber: true, eta: true, actualDeliveryDate: true, customer: { select: { companyName: true } } } });
  const onTime = delivered.filter(s => s.eta && s.actualDeliveryDate && s.actualDeliveryDate <= s.eta).length;
  res.json({ success: true, data: { totalDelivered: delivered.length, onTime, delayed: delivered.length - onTime, onTimeRate: delivered.length > 0 ? Math.round((onTime / delivered.length) * 100) : 0, shipments: delivered } });
}));

reportRoutes.get('/delayed', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const shipments = await prisma.shipment.findMany({ where: { eta: { lt: now }, status: { notIn: ['DELIVERED', 'CANCELLED'] }, isActive: true }, include: { customer: { select: { companyName: true } } }, orderBy: { eta: 'asc' } });
  const withDelay = shipments.map(s => ({ ...s, daysDelayed: s.eta ? Math.floor((now.getTime() - s.eta.getTime()) / 86400000) : 0 }));
  res.json({ success: true, data: withDelay, count: withDelay.length });
}));
