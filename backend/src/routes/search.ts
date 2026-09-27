import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const searchRoutes = Router();
searchRoutes.use(authenticate);

searchRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { q } = req.query as { q?: string };
  if (!q || q.trim().length < 2) throw createError('Search query must be at least 2 characters.', 400);

  const term = q.trim();

  const [shipments, customers, invoices, quotations] = await Promise.all([
    prisma.shipment.findMany({
      where: {
        isActive: true,
        OR: [
          { shipmentNumber: { contains: term } },
          { awbBlNumber: { contains: term } },
          { containerNumber: { contains: term } },
          { bookingNumber: { contains: term } },
          { customer: { companyName: { contains: term } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        shipmentNumber: true,
        status: true,
        origin: true,
        destination: true,
        customer: { select: { companyName: true } },
      },
    }),
    prisma.customer.findMany({
      where: {
        isActive: true,
        OR: [
          { companyName: { contains: term } },
          { contactPerson: { contains: term } },
          { email: { contains: term } },
          { customerId: { contains: term } },
        ],
      },
      take: 5,
      select: { id: true, customerId: true, companyName: true, contactPerson: true, email: true },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: term } },
          { customer: { companyName: { contains: term } } },
        ],
      },
      take: 5,
      select: { id: true, invoiceNumber: true, grandTotal: true, status: true, customer: { select: { companyName: true } } },
    }),
    prisma.quotation.findMany({
      where: {
        OR: [
          { quotationNumber: { contains: term } },
          { customer: { companyName: { contains: term } } },
        ],
      },
      take: 5,
      select: { id: true, quotationNumber: true, grandTotal: true, status: true, customer: { select: { companyName: true } } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      shipments,
      customers,
      invoices,
      quotations,
      total: shipments.length + customers.length + invoices.length + quotations.length,
    },
  });
}));
