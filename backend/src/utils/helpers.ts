/**
 * Helper utilities for Kreativ Icon Logistics Automation System
 */

/**
 * Generate shipment number in format KIC-YYYYMMDD-XXXX
 * @param count - today's shipment count (0-indexed), will be incremented
 */
export function generateShipmentNumber(count: number): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(count + 1).padStart(4, '0');
  return `KIC-${yyyy}${mm}${dd}-${seq}`;
}

/**
 * Generate quotation number in format QT-YYYYMM-XXXX
 * @param count - this month's quotation count (0-indexed), will be incremented
 */
export function generateQuotationNumber(count: number): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(count + 1).padStart(4, '0');
  return `QT-${yyyy}${mm}-${seq}`;
}

/**
 * Generate invoice number in format INV-YYYYMM-XXXX
 * @param count - this month's invoice count (0-indexed), will be incremented
 */
export function generateInvoiceNumber(count: number): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(count + 1).padStart(4, '0');
  return `INV-${yyyy}${mm}-${seq}`;
}

/**
 * Generate customer ID in format CUS-XXXX
 * @param count - total customer count (0-indexed), will be incremented
 */
export function generateCustomerId(count: number): string {
  const seq = String(count + 1).padStart(4, '0');
  return `CUS-${seq}`;
}

/**
 * Calculate profit and profit margin
 */
export function calculateProfit(
  sellingPrice: number,
  expenses: number
): { profit: number; profitMargin: number } {
  const profit = sellingPrice - expenses;
  const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return {
    profit: Number(profit.toFixed(2)),
    profitMargin: Number(profitMargin.toFixed(2)),
  };
}

/**
 * Format currency with locale-aware formatting
 */
export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Remove specified keys from an object (useful for stripping sensitive fields)
 */
export function sanitizeForPublic<T extends object>(
  obj: T,
  excludeKeys: string[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !excludeKeys.includes(key)) {
      result[key as keyof T] = obj[key as keyof T];
    }
  }
  return result;
}

/**
 * Parse pagination query parameters
 */
export function paginationParams(query: Record<string, unknown>): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  const pages = Math.ceil(total / limit);
  return { page, limit, total, pages };
}

