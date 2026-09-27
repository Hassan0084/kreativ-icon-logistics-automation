import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { generateCustomerId, paginationParams, buildPaginationMeta } from '../utils/helpers';
import { logActivity } from '../utils/activityLogger';

export const customerRoutes = Router();
customerRoutes.use(authenticate);

// GET / — List customers
customerRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, customerType, isActive } = req.query as Record<string, string>;
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);

  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where.isActive = isActive === 'true';
  else where.isActive = true;
  if (customerType) where.customerType = customerType;
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: 'insensitive' } },
      { contactPerson: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { customerId: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { companyName: 'asc' },
      include: {
        _count: { select: { shipments: true, invoices: true, quotations: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({ success: true, data: customers, pagination: buildPaginationMeta(total, page, limit) });
}));

// POST / — Create customer
customerRoutes.post('/', authorize('ADMIN', 'MANAGER', 'OPERATIONS', 'SALES'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { companyName, contactPerson, email, phone, whatsapp, address, city, country, vatNumber, paymentTerms, customerType, creditLimit, notes } = req.body;
  if (!companyName) throw createError('Company name is required.', 400);

  const count = await prisma.customer.count();
  const customerId = generateCustomerId(count + 1);

  const customer = await prisma.customer.create({
    data: { customerId, companyName, contactPerson, email, phone, whatsapp, address, city, country: country || 'Saudi Arabia', vatNumber, paymentTerms, customerType, creditLimit: creditLimit ? parseFloat(creditLimit) : undefined, notes },
  });

  await logActivity({ userId: req.user!.id, action: 'CREATE_CUSTOMER', entity: 'customer', entityId: customer.id, description: `Created customer: ${companyName}` });
  res.status(201).json({ success: true, data: customer });
}));

// GET /:id — Get customer by ID
customerRoutes.get('/:id', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { shipments: true, invoices: true, quotations: true } } },
  });
  if (!customer) throw createError('Customer not found.', 404);
  res.json({ success: true, data: customer });
}));

// PUT /:id — Update customer
customerRoutes.put('/:id', authorize('ADMIN', 'MANAGER', 'OPERATIONS', 'SALES'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Customer not found.', 404);

  const { companyName, contactPerson, email, phone, whatsapp, address, city, country, vatNumber, paymentTerms, customerType, creditLimit, notes } = req.body;
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { companyName, contactPerson, email, phone, whatsapp, address, city, country, vatNumber, paymentTerms, customerType, creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined, notes },
  });

  await logActivity({ userId: req.user!.id, action: 'UPDATE_CUSTOMER', entity: 'customer', entityId: customer.id, description: `Updated customer: ${customer.companyName}` });
  res.json({ success: true, data: customer });
}));

// DELETE /:id — Soft delete
customerRoutes.delete('/:id', authorize('ADMIN', 'MANAGER'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Customer not found.', 404);

  await prisma.customer.update({ where: { id: req.params.id }, data: { isActive: false } });
  await logActivity({ userId: req.user!.id, action: 'DELETE_CUSTOMER', entity: 'customer', entityId: req.params.id, description: `Deactivated customer: ${existing.companyName}` });
  res.json({ success: true, message: 'Customer deactivated successfully.' });
}));

// GET /:id/shipments
customerRoutes.get('/:id/shipments', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({ where: { customerId: req.params.id, isActive: true }, skip, take, orderBy: { createdAt: 'desc' }, include: { carrier: { select: { companyName: true } } } }),
    prisma.shipment.count({ where: { customerId: req.params.id, isActive: true } }),
  ]);
  res.json({ success: true, data: shipments, pagination: buildPaginationMeta(total, page, limit) });
}));

// GET /:id/invoices
customerRoutes.get('/:id/invoices', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({ where: { customerId: req.params.id }, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.invoice.count({ where: { customerId: req.params.id } }),
  ]);
  res.json({ success: true, data: invoices, pagination: buildPaginationMeta(total, page, limit) });
}));

// GET /:id/quotations
customerRoutes.get('/:id/quotations', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({ where: { customerId: req.params.id }, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.quotation.count({ where: { customerId: req.params.id } }),
  ]);
  res.json({ success: true, data: quotations, pagination: buildPaginationMeta(total, page, limit) });
}));
