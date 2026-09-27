import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const trackingRoutes = Router();

// GET /:shipmentNumber — Public tracking (no auth required)
trackingRoutes.get('/:shipmentNumber', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { shipmentNumber } = req.params;

  const shipment = await prisma.shipment.findUnique({
    where: { shipmentNumber: shipmentNumber.toUpperCase() },
    select: {
      id: true,
      shipmentNumber: true,
      status: true,
      serviceType: true,
      shipmentType: true,
      origin: true,
      destination: true,
      cargoDescription: true,
      cargoType: true,
      numberOfPackages: true,
      weight: true,
      volume: true,
      pickupDate: true,
      etd: true,
      eta: true,
      actualDeliveryDate: true,
      isActive: true,
      createdAt: true,
      customer: { select: { companyName: true } },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        select: { status: true, notes: true, location: true, createdAt: true },
      },
    },
  });

  if (!shipment || !shipment.isActive) {
    throw createError('Shipment not found. Please check the shipment number and try again.', 404);
  }

  res.json({ success: true, data: shipment });
}));
