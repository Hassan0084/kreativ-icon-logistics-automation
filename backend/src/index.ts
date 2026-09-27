import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requireInternalRole, authenticate } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { dashboardRoutes } from './routes/dashboard';
import { customerRoutes } from './routes/customers';
import { supplierRoutes } from './routes/suppliers';
import { carrierRoutes } from './routes/carriers';
import { shipmentRoutes } from './routes/shipments';
import { trackingRoutes } from './routes/tracking';
import { quotationRoutes } from './routes/quotations';
import { invoiceRoutes } from './routes/invoices';
import { expenseRoutes } from './routes/expenses';
import { documentRoutes } from './routes/documents';
import { reportRoutes } from './routes/reports';
import { userRoutes } from './routes/users';
import { searchRoutes } from './routes/search';
import { notificationRoutes } from './routes/notifications';
import { supplierInvoiceRoutes } from './routes/supplierInvoices';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Authenticated responses must never be stored by a shared or intermediate
// cache. Without this, Express only sends an ETag and the browser applies
// heuristic caching, so after signing out and signing in as a different user
// the same URLs (/api/shipments, /api/dashboard/stats, ...) can be replayed
// straight from cache. Files served from /uploads get the same treatment.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ─── Static Files (Uploads) ────────────────────────────────────────────────────
app.use(
  '/uploads',
  (_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  },
  express.static(path.join(__dirname, '../uploads'))
);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────

// Internal application surface. Guarded so SUPPLIER accounts cannot reach
// shipments, customers, financials or user management, regardless of whether an
// individual route also applies its own `authorize(...)` checks.
//
// `authenticate` runs first to populate req.user; each router's own
// `.use(authenticate)` then short-circuits instead of re-querying.
const mountInternal = (path: string, router: express.Router) =>
  app.use(path, authenticate, requireInternalRole, router);

app.use('/api/auth', authRoutes);
app.use('/api/tracking', trackingRoutes); // public by design
app.use('/api/supplier-invoices', supplierInvoiceRoutes); // scoped per-role inside

mountInternal('/api/dashboard', dashboardRoutes);
mountInternal('/api/customers', customerRoutes);
mountInternal('/api/suppliers', supplierRoutes);
mountInternal('/api/carriers', carrierRoutes);
mountInternal('/api/shipments', shipmentRoutes);
mountInternal('/api/quotations', quotationRoutes);
mountInternal('/api/invoices', invoiceRoutes);
mountInternal('/api/expenses', expenseRoutes);
mountInternal('/api/documents', documentRoutes);
mountInternal('/api/reports', reportRoutes);
mountInternal('/api/users', userRoutes);
mountInternal('/api/search', searchRoutes);
mountInternal('/api/notifications', notificationRoutes);

// ─── Error Handlers ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`🚀 Kreativ Icon Backend running on port ${PORT}`);
  logger.info(`📌 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
