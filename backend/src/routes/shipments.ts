import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { generateShipmentNumber, calculateProfit, paginationParams, buildPaginationMeta } from '../utils/helpers';
import { logActivity } from '../utils/activityLogger';
import { notificationService } from '../services/notificationService';
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

export const shipmentRoutes = Router();
shipmentRoutes.use(authenticate);

// GET / — List shipments
shipmentRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, status, serviceType, customerId, dateFrom, dateTo } = req.query as Record<string, string>;
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const where: Record<string, unknown> = { isActive: true };
  if (status) where.status = status;
  if (serviceType) where.serviceType = serviceType;
  if (customerId) where.customerId = customerId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
  }
  if (q) {
    where.OR = [
      { shipmentNumber: { contains: q, mode: 'insensitive' } },
      { awbBlNumber: { contains: q, mode: 'insensitive' } },
      { containerNumber: { contains: q, mode: 'insensitive' } },
      { bookingNumber: { contains: q, mode: 'insensitive' } },
      { customer: { companyName: { contains: q, mode: 'insensitive' } } },
    ];
  }
  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where, skip, take, orderBy: { createdAt: 'desc' },
      include: { customer: { select: { companyName: true, customerId: true } }, carrier: { select: { companyName: true } }, assignedUser: { select: { name: true } } },
    }),
    prisma.shipment.count({ where }),
  ]);
  res.json({ success: true, data: shipments, pagination: buildPaginationMeta(total, page, limit) });
}));

// POST / — Create shipment
shipmentRoutes.post('/', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { customerId, serviceType, shipmentType, origin, destination, pickupAddress, deliveryAddress, supplierId, carrierId, awbBlNumber, containerNumber, bookingNumber, cargoDescription, cargoType, numberOfPackages, weight, volume, freightCost, sellingPrice, currency, pickupDate, etd, eta, assignedUserId, notes } = req.body;
  if (!customerId) throw createError('Customer is required.', 400);
  if (!serviceType) throw createError('Service type is required.', 400);
  if (!origin || !destination) throw createError('Origin and destination are required.', 400);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayCount = await prisma.shipment.count({ where: { createdAt: { gte: today, lt: tomorrow } } });
  const shipmentNumber = generateShipmentNumber(todayCount + 1);

  const fCost = parseFloat(freightCost || '0');
  const sPrice = parseFloat(sellingPrice || '0');
  const { profit, profitMargin } = calculateProfit(sPrice, fCost);

  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber, customerId, serviceType, shipmentType: shipmentType || 'IMPORT', origin, destination, pickupAddress, deliveryAddress,
      supplierId: supplierId || undefined, carrierId: carrierId || undefined, awbBlNumber, containerNumber, bookingNumber, cargoDescription,
      cargoType: cargoType || 'GENERAL', numberOfPackages: numberOfPackages ? parseInt(numberOfPackages) : undefined,
      weight: weight ? parseFloat(weight) : undefined, volume: volume ? parseFloat(volume) : undefined,
      freightCost: fCost, sellingPrice: sPrice, profit, profitMargin, currency: currency || 'SAR',
      pickupDate: pickupDate ? new Date(pickupDate) : undefined, etd: etd ? new Date(etd) : undefined, eta: eta ? new Date(eta) : undefined,
      assignedUserId: assignedUserId || undefined, notes, status: 'BOOKED',
    },
    include: { customer: true },
  });

  await prisma.shipmentStatusHistory.create({ data: { shipmentId: shipment.id, status: 'BOOKED', notes: 'Shipment created and booked.', updatedById: req.user!.id } });
  await logActivity({ userId: req.user!.id, action: 'CREATE_SHIPMENT', entity: 'shipment', entityId: shipment.id, description: `Created shipment ${shipmentNumber}` });
  res.status(201).json({ success: true, data: shipment });
}));

// GET /:id — Get shipment details
shipmentRoutes.get('/:id', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true, supplier: true, carrier: true, assignedUser: { select: { id: true, name: true, email: true } },
      statusHistory: { orderBy: { createdAt: 'desc' }, include: { updatedBy: { select: { name: true } } } },
      expenses: true,
      documents: { include: { uploadedBy: { select: { name: true } } } },
      invoices: { select: { id: true, invoiceNumber: true, grandTotal: true, status: true } },
    },
  });
  if (!shipment || !shipment.isActive) throw createError('Shipment not found.', 404);
  res.json({ success: true, data: shipment });
}));

// PUT /:id — Update shipment
shipmentRoutes.put('/:id', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.shipment.findUnique({ where: { id: req.params.id } });
  if (!existing || !existing.isActive) throw createError('Shipment not found.', 404);

  const { freightCost, sellingPrice, ...rest } = req.body;
  const fCost = freightCost !== undefined ? parseFloat(freightCost) : existing.freightCost || 0;
  const sPrice = sellingPrice !== undefined ? parseFloat(sellingPrice) : existing.sellingPrice || 0;
  const { profit, profitMargin } = calculateProfit(sPrice, fCost);

  const updateData: Record<string, unknown> = { ...rest, freightCost: fCost, sellingPrice: sPrice, profit, profitMargin };
  if (rest.pickupDate) updateData.pickupDate = new Date(rest.pickupDate);
  if (rest.etd) updateData.etd = new Date(rest.etd);
  if (rest.eta) updateData.eta = new Date(rest.eta);
  if (rest.actualDeliveryDate) updateData.actualDeliveryDate = new Date(rest.actualDeliveryDate);

  const shipment = await prisma.shipment.update({ where: { id: req.params.id }, data: updateData as Parameters<typeof prisma.shipment.update>[0]['data'] });
  await logActivity({ userId: req.user!.id, action: 'UPDATE_SHIPMENT', entity: 'shipment', entityId: shipment.id, description: `Updated shipment ${shipment.shipmentNumber}` });
  res.json({ success: true, data: shipment });
}));

// DELETE /:id — Soft delete
shipmentRoutes.delete('/:id', authorize('ADMIN', 'MANAGER'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.shipment.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Shipment not found.', 404);
  await prisma.shipment.update({ where: { id: req.params.id }, data: { isActive: false } });
  await logActivity({ userId: req.user!.id, action: 'DELETE_SHIPMENT', entity: 'shipment', entityId: req.params.id, description: `Deleted shipment ${existing.shipmentNumber}` });
  res.json({ success: true, message: 'Shipment deleted.' });
}));

// POST /:id/status — Update status
shipmentRoutes.post('/:id/status', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, notes, location } = req.body as { status: ShipmentStatus; notes?: string; location?: string };
  if (!status) throw createError('Status is required.', 400);

  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id }, include: { customer: true } });
  if (!shipment || !shipment.isActive) throw createError('Shipment not found.', 404);

  const updateData: Record<string, unknown> = { status };
  if (status === ShipmentStatus.DELIVERED) updateData.actualDeliveryDate = new Date();

  await prisma.shipment.update({ where: { id: req.params.id }, data: updateData as Parameters<typeof prisma.shipment.update>[0]['data'] });
  await prisma.shipmentStatusHistory.create({ data: { shipmentId: req.params.id, status, notes, location, updatedById: req.user!.id } });

  if (shipment.customer?.email) {
    notificationService.notifyShipmentStatusChange({ ...shipment, status }, shipment.customer, status).catch(() => {});
  }

  await logActivity({ userId: req.user!.id, action: 'STATUS_UPDATE', entity: 'shipment', entityId: req.params.id, description: `Status changed to ${status} for ${shipment.shipmentNumber}` });
  res.json({ success: true, message: `Status updated to ${status}.` });
}));

// GET /:id/history
shipmentRoutes.get('/:id/history', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const history = await prisma.shipmentStatusHistory.findMany({
    where: { shipmentId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { updatedBy: { select: { name: true } } },
  });
  res.json({ success: true, data: history });
}));

// GET /:id/profit
shipmentRoutes.get('/:id/profit', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
  if (!shipment) throw createError('Shipment not found.', 404);
  const expensesAgg = await prisma.expense.aggregate({ _sum: { amountInSAR: true }, where: { shipmentId: req.params.id } });
  const totalExpenses = expensesAgg._sum.amountInSAR || 0;
  const revenue = shipment.sellingPrice || 0;
  const grossProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  res.json({ success: true, data: { revenue, freightCost: shipment.freightCost || 0, totalExpenses, grossProfit, profitMargin: Math.round(margin * 100) / 100 } });
}));
