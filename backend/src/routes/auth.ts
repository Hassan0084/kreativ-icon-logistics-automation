import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, AuthRequest, generateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// POST / — Login
authRoutes.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      throw createError('Email and password are required.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { supplier: { select: { id: true, companyName: true } } },
    });

    if (!user || !user.isActive) {
      throw createError('Invalid email or password.', 401);
    }

    // Verify credentials BEFORE any account-state check. Otherwise the status
    // code and message differ for a real-but-unlinked account, which lets an
    // attacker confirm that an email is registered.
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw createError('Invalid email or password.', 401);
    }

    // A supplier account with no supplier record attached cannot file invoices.
    if (user.role === 'SUPPLIER' && !user.supplierId) {
      throw createError(
        'Your supplier account is not linked to a supplier record. Please contact the administrator.',
        403
      );
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    });

    // Optional: set cookie too
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24h
    });

    logger.info(`[Auth] User ${user.email} logged in successfully.`);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      data: {
        id: user.id,
        name: user.name,
        fullName: user.name,
        email: user.email,
        role: user.role,
        supplierId: user.supplierId,
        supplierName: user.supplier?.companyName ?? null,
        lastLoginAt: user.lastLoginAt,
      },
    });
  })
);

// POST /logout — Logout
authRoutes.post(
  '/logout',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully.' });
  })
);

// GET /me — Get current user
authRoutes.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        supplierId: true,
        supplier: { select: { id: true, companyName: true } },
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createError('User not found.', 404);
    }

    res.json({
      success: true,
      data: {
        ...user,
        fullName: user.name,
        supplierId: user.supplierId,
        supplierName: user.supplier?.companyName ?? null,
      },
    });
  })
);

// PUT /change-password — Change password
authRoutes.put(
  '/change-password',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      throw createError('Current password and new password are required.', 400);
    }

    if (newPassword.length < 8) {
      throw createError('New password must be at least 8 characters long.', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw createError('User not found.', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw createError('Current password is incorrect.', 400);
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    logger.info(`[Auth] User ${user.email} changed their password.`);
    res.json({ success: true, message: 'Password updated successfully.' });
  })
);
