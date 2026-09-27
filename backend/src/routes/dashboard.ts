import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
export enum ShipmentStatus {
  BOOKED = 'BOOKED',
  PICKUP_PENDING = 'PICKUP_PENDING',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  CUSTOMS = 'CUSTOMS',
  CUSTOMS_CLEARED = 'CUSTOMS_CLEARED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate);

// GET /stats
dashboardRoutes.get('/stats', asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();

  const [
    totalCustomers,
    activeShipments,
    deliveredShipments,
    pendingShipments,
    delayedShipments,
    revenueResult,
    expensesResult,
    outstandingResult,
    activeQuotations,
  ] = await Promise.all([
    prisma.customer.count({ where: { isActive: true } }),
    prisma.shipment.count({ where: { status: { in: ['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'CUSTOMS', 'CUSTOMS_CLEARED'] }, isActive: true } }),
    prisma.shipment.count({ where: { status: 'DELIVERED', isActive: true } }),
    prisma.shipment.count({ where: { status: { in: ['BOOKED', 'PICKUP_PENDING'] }, isActive: true } }),
    prisma.shipment.count({ where: { eta: { lt: now }, status: { notIn: ['DELIVERED', 'CANCELLED'] }, isActive: true } }),
    prisma.invoice.aggregate({ _sum: { grandTotal: true }, where: { status: 'PAID' } }),
    prisma.expense.aggregate({ _sum: { amountInSAR: true } }),
    prisma.invoice.aggregate({ _sum: { balance: true }, where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } } }),
    prisma.quotation.count({ where: { status: { in: ['DRAFT', 'SENT'] } } }),
  ]);

  res.json({
    success: true,
    data: {
      totalCustomers,
      activeShipments,
      deliveredShipments,
      pendingShipments,
      delayedShipments,
      totalRevenue: revenueResult._sum.grandTotal || 0,
      totalExpenses: expensesResult._sum.amountInSAR || 0,
      outstandingInvoices: outstandingResult._sum.balance || 0,
      activeQuotations,
    },
  });
}));

// GET /charts
dashboardRoutes.get('/charts', asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [shipments, invoices, expenses, statusDistribution, serviceDistribution] = await Promise.all([
    prisma.shipment.findMany({
      where: { createdAt: { gte: twelveMonthsAgo }, isActive: true },
      select: { createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { createdAt: { gte: twelveMonthsAgo }, status: 'PAID' },
      select: { createdAt: true, grandTotal: true },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true, amountInSAR: true },
    }),
    prisma.shipment.groupBy({ by: ['status'], _count: { id: true }, where: { isActive: true } }),
    prisma.shipment.groupBy({ by: ['serviceType'], _count: { id: true }, where: { isActive: true } }),
  ]);

  const shipmentsMap: Record<string, number> = {};
  shipments.forEach((s) => {
    const m = s.createdAt.toISOString().substring(0, 7);
    shipmentsMap[m] = (shipmentsMap[m] || 0) + 1;
  });

  const revenueMap: Record<string, number> = {};
  invoices.forEach((i) => {
    const m = i.createdAt.toISOString().substring(0, 7);
    revenueMap[m] = (revenueMap[m] || 0) + (i.grandTotal || 0);
  });

  const expensesMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const m = e.createdAt.toISOString().substring(0, 7);
    expensesMap[m] = (expensesMap[m] || 0) + (e.amountInSAR || 0);
  });

  const shipmentsByMonth = Object.keys(shipmentsMap)
    .sort()
    .map((m) => ({ month: m, count: shipmentsMap[m] }));
  const revenueByMonth = Object.keys(revenueMap)
    .sort()
    .map((m) => ({ month: m, revenue: revenueMap[m] }));
  const expensesByMonth = Object.keys(expensesMap)
    .sort()
    .map((m) => ({ month: m, expenses: expensesMap[m] }));

  res.json({
    success: true,
    data: {
      shipmentsByMonth,
      revenueByMonth,
      expensesByMonth,
      statusDistribution: statusDistribution.map((r) => ({ status: r.status, count: r._count.id })),
      serviceDistribution: serviceDistribution.map((r) => ({ serviceType: r.serviceType, count: r._count.id })),
    },
  });
}));

// GET /recent-activity
dashboardRoutes.get('/recent-activity', asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const logs = await prisma.activityLog.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });
  res.json({ success: true, data: logs });
}));

// GET /upcoming-deliveries
dashboardRoutes.get('/upcoming-deliveries', asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const shipments = await prisma.shipment.findMany({
    where: {
      status: { in: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.IN_TRANSIT, ShipmentStatus.CUSTOMS_CLEARED] },
      eta: { gte: now, lte: sevenDays },
      isActive: true,
    },
    orderBy: { eta: 'asc' },
    take: 10,
    include: { customer: { select: { companyName: true } } },
  });
  res.json({ success: true, data: shipments });
}));

// GET /delayed-shipments
dashboardRoutes.get('/delayed-shipments', asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const shipments = await prisma.shipment.findMany({
    where: {
      eta: { lt: now },
      status: { notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED] },
      isActive: true,
    },
    orderBy: { eta: 'asc' },
    take: 20,
    include: { customer: { select: { companyName: true } } },
  });

  const withDaysDelayed = shipments.map(s => ({
    ...s,
    daysDelayed: s.eta ? Math.floor((now.getTime() - s.eta.getTime()) / (1000 * 60 * 60 * 24)) : 0,
  }));

  res.json({ success: true, data: withDaysDelayed });
}));
