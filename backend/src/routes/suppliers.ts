import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { paginationParams, buildPaginationMeta } from '../utils/helpers';

export const supplierRoutes = Router();
supplierRoutes.use(authenticate);

supplierRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { q } = req.query as Record<string, string>;
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const where: Record<string, unknown> = { isActive: true };
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: 'insensitive' } },
      { contactPerson: { contains: q, mode: 'insensitive' } },
      { country: { contains: q, mode: 'insensitive' } },
    ];
  }
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, skip, take, orderBy: { companyName: 'asc' } }),
    prisma.supplier.count({ where }),
  ]);
  res.json({ success: true, data: suppliers, pagination: buildPaginationMeta(total, page, limit) });
}));

supplierRoutes.post('/', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { companyName, contactPerson, email, phone, address, city, country, services, notes } = req.body;
  if (!companyName) throw createError('Company name is required.', 400);
  const supplier = await prisma.supplier.create({ data: { companyName, contactPerson, email, phone, address, city, country, services: services || [], notes } });
  res.status(201).json({ success: true, data: supplier });
}));

supplierRoutes.get('/:id', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!supplier) throw createError('Supplier not found.', 404);
  res.json({ success: true, data: supplier });
}));

supplierRoutes.put('/:id', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Supplier not found.', 404);
  const { companyName, contactPerson, email, phone, address, city, country, services, notes } = req.body;
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: { companyName, contactPerson, email, phone, address, city, country, services: services || existing.services, notes } });
  res.json({ success: true, data: supplier });
}));

supplierRoutes.delete('/:id', authorize('ADMIN', 'MANAGER'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Supplier not found.', 404);
  await prisma.supplier.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Supplier deactivated.' });
}));
