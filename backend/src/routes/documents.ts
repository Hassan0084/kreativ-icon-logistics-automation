import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

export const documentRoutes = Router();
documentRoutes.use(authenticate);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed. Supported: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

documentRoutes.post('/upload', upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) throw createError('No file uploaded.', 400);
  const { entityType, entityId, documentType, notes } = req.body;
  if (!entityType || !entityId) throw createError('entityType and entityId are required.', 400);
  const document = await prisma.document.create({
    data: {
      entityType,
      entityId,
      documentType: documentType || 'OTHER',
      originalName: req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      notes,
      uploadedById: req.user!.id,
    },
    include: { uploadedBy: { select: { name: true } } },
  });
  res.status(201).json({ success: true, data: { ...document, url: `/uploads/${document.filename}` } });
}));

documentRoutes.get('/', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { entityType, entityId } = req.query as Record<string, string>;
  if (!entityType || !entityId) throw createError('entityType and entityId are required.', 400);
  const documents = await prisma.document.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    include: { uploadedBy: { select: { name: true } } },
  });
  const withUrls = documents.map(d => ({ ...d, url: `/uploads/${d.filename}` }));
  res.json({ success: true, data: withUrls });
}));

documentRoutes.delete('/:id', authorize('ADMIN', 'MANAGER', 'OPERATIONS'), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const document = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!document) throw createError('Document not found.', 404);
  if (fs.existsSync(document.filePath)) {
    fs.unlinkSync(document.filePath);
  }
  await prisma.document.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Document deleted.' });
}));
