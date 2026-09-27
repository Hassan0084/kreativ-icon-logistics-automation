import { prisma } from '../config/database';
import { logger } from './logger';

interface ActivityData {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export const logActivity = async (data: ActivityData): Promise<void> => {
  try {
    await prisma.activityLog.create({ data: data as any });
  } catch (err) {
    logger.error('[ActivityLog] Failed to log activity:', err);
  }
};
