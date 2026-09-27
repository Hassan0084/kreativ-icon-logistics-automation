import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logActivity } from '../utils/activityLogger';

export const userRoutes = Router();
userRoutes.use(authenticate);

userRoutes.get('/', authorize('ADMIN'), asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } });
  res.json({ success: true, data: users });
}));

userRoutes.post('/', authorize('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) throw createError('Name, email, and password are required.', 400);
  if (password.length < 8) throw createError('Password must be at least 8 characters.', 400);
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw createError('A user with this email already exists.', 409);
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), password: hashed, role: role || 'VIEWER' }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } });
  await logActivity({ userId: req.user!.id, action: 'CREATE_USER', entity: 'user', entityId: user.id, description: `Created user: ${name}` });
  res.status(201).json({ success: true, data: user });
}));

userRoutes.get('/:id', authorize('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } });
  if (!user) throw createError('User not found.', 404);
  res.json({ success: true, data: user });
}));

userRoutes.put('/:id', authorize('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, role, isActive } = req.body;
  if (req.params.id === req.user!.id && isActive === false) throw createError('You cannot disable your own account.', 400);
  if (req.params.id === req.user!.id && role && role !== req.user!.role) throw createError('You cannot change your own role.', 400);
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('User not found.', 404);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { name, email: email?.toLowerCase(), role, isActive }, select: { id: true, name: true, email: true, role: true, isActive: true } });
  await logActivity({ userId: req.user!.id, action: 'UPDATE_USER', entity: 'user', entityId: user.id, description: `Updated user: ${user.name}` });
  res.json({ success: true, data: user });
}));

userRoutes.delete('/:id', authorize('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.params.id === req.user!.id) throw createError('You cannot disable your own account.', 400);
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('User not found.', 404);
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  await logActivity({ userId: req.user!.id, action: 'DISABLE_USER', entity: 'user', entityId: req.params.id, description: `Disabled user: ${existing.name}` });
  res.json({ success: true, message: 'User disabled.' });
}));

userRoutes.post('/:id/reset-password', authorize('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw createError('New password must be at least 8 characters.', 400);
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('User not found.', 404);
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
  await logActivity({ userId: req.user!.id, action: 'RESET_PASSWORD', entity: 'user', entityId: req.params.id, description: `Reset password for: ${existing.name}` });
  res.json({ success: true, message: 'Password reset successfully.' });
}));
