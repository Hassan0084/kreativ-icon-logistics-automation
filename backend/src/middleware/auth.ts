import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { createError } from './errorHandler';
export type Role =
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATIONS'
  | 'SALES'
  | 'FINANCE'
  | 'VIEWER'
  | 'SUPPLIER';

/** Roles that belong to internal Kreativ Icon staff. */
export const INTERNAL_ROLES: Role[] = [
  'ADMIN',
  'MANAGER',
  'OPERATIONS',
  'SALES',
  'FINANCE',
  'VIEWER',
];

/**
 * A SUPPLIER account must always be tied to a supplier record. This reads the
 * link from the database rather than the JWT so a recently-assigned supplier
 * takes effect without forcing the user to log in again.
 */
export const getRequestSupplierId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role !== 'SUPPLIER' || !req.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { supplierId: true },
  });
  return user?.supplierId ?? null;
};

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Already verified by an upstream `authenticate` (e.g. a route mounted with
    // `app.use(path, authenticate, requireInternalRole, router)`). Skip the
    // redundant token verify and user lookup.
    if (req.user) return next();

    const token =
      req.headers.authorization?.split(' ')[1] ||
      req.cookies?.token;

    if (!token) {
      return next(createError('Authentication required. Please log in.', 401));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(createError('Server configuration error', 500));
    }

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name: string;
      role: Role;
    };

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isActive: true },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user) {
      return next(createError('User not found or account disabled.', 401));
    }

    req.user = { ...user, role: user.role as Role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(createError('Session expired. Please log in again.', 401));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(createError('Invalid authentication token.', 401));
    }
    next(err);
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError('Authentication required.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

/**
 * Gate for the internal application surface.
 *
 * Individual routes use `authorize(...)` for per-action roles, but many only
 * used `authenticate`. That was safe while every account belonged to staff; now
 * that SUPPLIER accounts exist, those routes would expose shipments, customers
 * and financials to external users. Mount every internal router behind this.
 */
export const requireInternalRole = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(createError('Authentication required.', 401));
  }
  if (!INTERNAL_ROLES.includes(req.user.role)) {
    return next(createError('This area is restricted to internal staff.', 403));
  }
  next();
};

export const generateToken = (payload: {
  id: string;
  email: string;
  name: string;
  role: Role;
}): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'],
  });
};
