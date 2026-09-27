import { Router, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/database';
import {
  authenticate,
  authorize,
  AuthRequest,
  getRequestSupplierId,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logActivity } from '../utils/activityLogger';
import { paginationParams, buildPaginationMeta } from '../utils/helpers';
import {
  uploadInvoiceFile,
  createSignedUrl,
  removeFile,
  isStorageConfigured,
} from '../services/storageService';

export const supplierInvoiceRoutes = Router();
supplierInvoiceRoutes.use(authenticate);

/** Staff who may see every supplier's invoices. */
const REVIEW_ROLES = ['ADMIN', 'MANAGER', 'FINANCE'] as const;

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Files are held in memory and streamed to Supabase Storage, so the container
 * filesystem is never used. The size cap also bounds memory per request.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createError('File type not allowed. Upload a PDF, JPG, PNG, WEBP or DOCX file.', 400));
    }
  },
});

const parseAmount = (value: unknown, field: string): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw createError(`${field} must be a positive number.`, 400);
  }
  return Math.round(n * 100) / 100;
};

/**
 * Resolve which supplier the caller is acting as.
 * Staff may act for any supplier; a SUPPLIER is always locked to their own.
 */
const resolveSupplierId = async (req: AuthRequest, requested?: string): Promise<string> => {
  if (req.user!.role === 'SUPPLIER') {
    const own = await getRequestSupplierId(req);
    if (!own) {
      throw createError('Your account is not linked to a supplier record.', 403);
    }
    return own;
  }

  if (!requested) {
    throw createError('A supplier must be selected.', 400);
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: requested },
    select: { id: true },
  });
  if (!supplier) throw createError('Supplier not found.', 404);
  return supplier.id;
};

// GET / — List invoices. SUPPLIER sees only their own.
supplierInvoiceRoutes.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { skip, take, page, limit } = paginationParams(
      req.query as Record<string, string>
    );
    const { q, status, shipmentId, supplierId } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};

    if (req.user!.role === 'SUPPLIER') {
      const own = await getRequestSupplierId(req);
      if (!own) throw createError('Your account is not linked to a supplier record.', 403);
      where.supplierId = own;
    } else if (supplierId) {
      where.supplierId = supplierId;
    }

    if (status) where.status = status;
    if (shipmentId) where.shipmentId = shipmentId;
    if (q) {
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { supplier: { companyName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, companyName: true } },
          shipment: { select: { id: true, shipmentNumber: true } },
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.supplierInvoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: buildPaginationMeta(page, limit, total),
    });
  })
);

// GET /summary — Totals for the caller's visible invoices.
supplierInvoiceRoutes.get(
  '/summary',
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const where: Record<string, unknown> = {};

    if (req.user!.role === 'SUPPLIER') {
      const own = await getRequestSupplierId(req);
      if (!own) throw createError('Your account is not linked to a supplier record.', 403);
      where.supplierId = own;
    } else if (req.query.supplierId) {
      where.supplierId = req.query.supplierId;
    }

    const [agg, count] = await Promise.all([
      prisma.supplierInvoice.aggregate({
        _sum: { total: true, vatAmount: true },
        where,
      }),
      prisma.supplierInvoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        invoiceCount: count,
        totalAmount: agg._sum.total || 0,
        totalVat: agg._sum.vatAmount || 0,
      },
    });
  })
);

// POST / — Upload an invoice (multipart/form-data)
supplierInvoiceRoutes.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!isStorageConfigured()) {
      throw createError(
        'File storage is not configured on the server. Please contact the administrator.',
        500
      );
    }
    if (!req.file) throw createError('An invoice file is required.', 400);

    const {
      invoiceNumber,
      supplierId: requestedSupplierId,
      shipmentId,
      invoiceDate,
      dueDate,
      subtotal,
      vatRate,
      vatAmount,
      total,
      currency,
      notes,
    } = req.body as Record<string, string>;

    if (!invoiceNumber || !invoiceNumber.trim()) {
      throw createError('Invoice number is required.', 400);
    }

    const supplierId = await resolveSupplierId(req, requestedSupplierId);

    // Prefer a submitted total, otherwise derive it from subtotal + VAT.
    let finalSubtotal = parseAmount(subtotal ?? 0, 'Subtotal');
    let finalVatRate = vatRate !== undefined ? parseAmount(vatRate, 'VAT rate') : 15;
    let finalVat =
      vatAmount !== undefined
        ? parseAmount(vatAmount, 'VAT amount')
        : Math.round(finalSubtotal * (finalVatRate / 100) * 100) / 100;
    let finalTotal =
      total !== undefined
        ? parseAmount(total, 'Total')
        : Math.round((finalSubtotal + finalVat) * 100) / 100;

    if (finalSubtotal === 0 && finalTotal > 0) {
      // Supplier sent only a grand total — back out the VAT component.
      finalVat = Math.round((finalTotal - finalSubtotal) * 100) / 100;
    }

    if (shipmentId) {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        select: { id: true },
      });
      if (!shipment) throw createError('Shipment not found.', 404);
    }

    // Create the row first to get an id, then upload against that id as a prefix.
    const invoice = await prisma.supplierInvoice.create({
      data: {
        invoiceNumber: invoiceNumber.trim(),
        supplierId,
        shipmentId: shipmentId || undefined,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal: finalSubtotal,
        vatRate: finalVatRate,
        vatAmount: finalVat,
        total: finalTotal,
        currency: currency || 'SAR',
        notes: notes || undefined,
        status: 'SUBMITTED',
        storagePath: 'pending',
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedById: req.user!.id,
      },
    });

    try {
      const storagePath = await uploadInvoiceFile(
        req.file.buffer,
        req.file.originalname,
        supplierId,
        invoice.id,
        req.file.mimetype
      );
      const updated = await prisma.supplierInvoice.update({
        where: { id: invoice.id },
        data: { storagePath },
        include: {
          supplier: { select: { id: true, companyName: true } },
          shipment: { select: { id: true, shipmentNumber: true } },
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      });
      await logActivity({
        userId: req.user!.id,
        action: 'UPLOAD_SUPPLIER_INVOICE',
        entity: 'supplierInvoice',
        entityId: updated.id,
        description: `Supplier invoice ${updated.invoiceNumber} uploaded`,
      });
      res.status(201).json({ success: true, data: updated });
    } catch (err) {
      // Roll back the orphaned row so we never store a record with no file.
      await prisma.supplierInvoice
        .delete({ where: { id: invoice.id } })
        .catch(() => undefined);
      throw err;
    }
  })
);

// GET /:id/download — Short-lived signed URL for the stored file.
supplierInvoiceRoutes.get(
  '/:id/download',
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id: req.params.id },
      select: { id: true, storagePath: true, supplierId: true, originalName: true },
    });
    if (!invoice) throw createError('Supplier invoice not found.', 404);

    if (req.user!.role === 'SUPPLIER') {
      const own = await getRequestSupplierId(req);
      if (!own || own !== invoice.supplierId) {
        throw createError('You do not have permission to view this invoice.', 403);
      }
    } else if (!(REVIEW_ROLES as readonly string[]).includes(req.user!.role)) {
      throw createError('You do not have permission to view supplier invoices.', 403);
    }

    if (invoice.storagePath === 'pending') {
      throw createError('This invoice file is still processing. Please try again shortly.', 409);
    }

    const url = await createSignedUrl(invoice.storagePath, 300);
    res.json({
      success: true,
      data: {
        url,
        fileName: invoice.originalName,
        expiresIn: 300,
      },
    });
  })
);

// PATCH /:id/status — Mark as reviewed. Storage/records only, no approval flow.
supplierInvoiceRoutes.patch(
  '/:id/status',
  authorize('ADMIN', 'MANAGER', 'FINANCE'),
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { status } = req.body as { status?: string };
    if (status !== 'SUBMITTED' && status !== 'REVIEWED') {
      throw createError('Status must be SUBMITTED or REVIEWED.', 400);
    }
    const existing = await prisma.supplierInvoice.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) throw createError('Supplier invoice not found.', 404);

    const invoice = await prisma.supplierInvoice.update({
      where: { id: req.params.id },
      data: { status },
    });
    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_SUPPLIER_INVOICE',
      entity: 'supplierInvoice',
      entityId: invoice.id,
      description: `Supplier invoice ${invoice.invoiceNumber} marked ${status}`,
    });
    res.json({ success: true, data: invoice });
  })
);

// DELETE /:id — Remove the record and its stored file.
supplierInvoiceRoutes.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const existing = await prisma.supplierInvoice.findUnique({
      where: { id: req.params.id },
      select: { id: true, storagePath: true, invoiceNumber: true },
    });
    if (!existing) throw createError('Supplier invoice not found.', 404);

    await removeFile(existing.storagePath);
    await prisma.supplierInvoice.delete({ where: { id: req.params.id } });

    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_SUPPLIER_INVOICE',
      entity: 'supplierInvoice',
      entityId: existing.id,
      description: `Deleted supplier invoice ${existing.invoiceNumber}`,
    });
    res.json({ success: true, message: 'Supplier invoice deleted.' });
  })
);
