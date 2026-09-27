import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { notificationService } from '../services/notificationService';

export const notificationRoutes = Router();
notificationRoutes.use(authenticate);

notificationRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const where = req.user!.role === 'ADMIN' ? {} : { sentById: req.user!.id };
  const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ success: true, data: notifications });
}));

notificationRoutes.post('/send', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, subject, message, channel } = req.body;
  if (!message) throw new Error('Message is required.');
  if (email && channel === 'EMAIL') {
    await notificationService.sendEmail(email, subject || 'Notification from Kreativ Icon', message);
  }
  const notification = await prisma.notification.create({
    data: { email, channel: channel || 'EMAIL', subject, message, status: 'SENT', sentAt: new Date(), sentById: req.user!.id },
  });
  res.json({ success: true, data: notification });
}));

notificationRoutes.patch('/:id/read', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.notification.update({ where: { id: req.params.id }, data: { status: 'READ', readAt: new Date() } });
  res.json({ success: true, message: 'Notification marked as read.' });
}));
