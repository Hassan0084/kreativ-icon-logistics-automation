import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { paginationParams, buildPaginationMeta } from '../utils/helpers';

export const carrierRoutes = Router();
carrierRoutes.use(authenticate);

carrierRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, carrierType } = req.query as Record<string, string>;
  const { skip, take, page, limit } = paginationParams(req.query as Record<string, string>);
  const where: Record<string, unknown> = { isActive: true };
  if (carrierType) where.carrierType = carrierType;
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: 'insensitive' } },
      { contactPerson: { contains: q, mode: 'insensitive' } },
      { country: { contains: q, mode: 'insensitive' } },
      { iataCode: { contains: q, mode: 'insensitive' } },
    ];
  }
  const [carriers, total] = await Promise.all([
    prisma.carrier.findMany({ where, skip, take, orderBy: { companyName: 'asc' } }),
    prisma.carrier.count({ where }),
  ]);
  res.json({ success: true, data: carriers, pagination: buildPaginationMeta(total, page, limit) });
}));

carrierRoutes.post('/', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { companyName, carrierType, contactPerson, email, phone, country, routes, iataCode, scacCode, notes } = req.body;
  if (!companyName) throw createError('Company name is required.', 400);
  if (!carrierType) throw createError('Carrier type is required.', 400);
  const carrier = await prisma.carrier.create({ data: { companyName, carrierType, contactPerson, email, phone, country, routes: routes || [], iataCode, scacCode, notes } });
  res.status(201).json({ success: true, data: carrier });
}));

carrierRoutes.get('/:id', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const carrier = await prisma.carrier.findUnique({ where: { id: req.params.id } });
  if (!carrier) throw createError('Carrier not found.', 404);
  res.json({ success: true, data: carrier });
}));

carrierRoutes.put('/:id', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.carrier.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Carrier not found.', 404);
  const { companyName, carrierType, contactPerson, email, phone, country, routes, iataCode, scacCode, notes } = req.body;
  const carrier = await prisma.carrier.update({ where: { id: req.params.id }, data: { companyName, carrierType, contactPerson, email, phone, country, routes: routes || existing.routes, iataCode, scacCode, notes } });
  res.json({ success: true, data: carrier });
}));

carrierRoutes.delete('/:id', authorize('ADMIN', 'MANAGER'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.carrier.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Carrier not found.', 404);
  await prisma.carrier.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Carrier deactivated.' });
}));
