export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATIONS'
  | 'SALES'
  | 'FINANCE'
  | 'VIEWER'
  | 'SUPPLIER';

/** Roles that belong to internal staff and get the full application shell. */
export const INTERNAL_ROLES: UserRole[] = [
  'ADMIN',
  'MANAGER',
  'OPERATIONS',
  'SALES',
  'FINANCE',
  'VIEWER',
];

export const isInternalRole = (role?: UserRole | null): boolean =>
  !!role && INTERNAL_ROLES.includes(role);

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Only present for SUPPLIER accounts. */
  supplierId?: string | null;
  supplierName?: string | null;
}

export type CustomerType = 'INDIVIDUAL' | 'CORPORATE' | 'GOVERNMENT';

export interface Customer {
  id: string;
  customerId: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  taxNumber?: string;
  customerType: CustomerType;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    shipments: number;
    invoices: number;
    quotations: number;
  };
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  country: string;
  serviceProvided?: string;
  rating?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CarrierType = 'AIRLINE' | 'SHIPPING_LINE' | 'TRUCKING_COMPANY' | 'COURIER';

export interface Carrier {
  id: string;
  companyName: string;
  carrierType: CarrierType;
  contactPerson?: string;
  email?: string;
  phone?: string;
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ShipmentStatus =
  | 'BOOKED'
  | 'PICKUP_PENDING'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'CUSTOMS_HOLD'
  | 'CUSTOMS_CLEARED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type ServiceType =
  | 'AIR_FREIGHT'
  | 'SEA_FREIGHT_FCL'
  | 'SEA_FREIGHT_LCL'
  | 'LAND_FREIGHT'
  | 'CUSTOMS_CLEARANCE'
  | 'WAREHOUSING'
  | 'DOOR_TO_DOOR';

export interface ShipmentStatusHistory {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  notes?: string;
  location?: string;
  createdBy?: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  awbBlNumber?: string;
  containerNumber?: string;
  bookingNumber?: string;
  status: ShipmentStatus;
  serviceType: ServiceType;
  origin: string;
  destination: string;
  originPort?: string;
  destinationPort?: string;
  etd?: string;
  eta?: string;
  actualDeliveryDate?: string;
  freightCost: number;
  sellingPrice: number;
  profit: number;
  profitMargin: number;
  currency: string;
  numberOfPackages?: number;
  weight?: number;
  volume?: number;
  chargeableWeight?: number;
  cargoDescription?: string;
  hscode?: string;
  customer?: Customer;
  customerId: string;
  carrier?: Carrier;
  carrierId?: string;
  supplier?: Supplier;
  supplierId?: string;
  assignedUser?: User;
  assignedUserId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  statusHistory?: ShipmentStatusHistory[];
  expenses?: Expense[];
  documents?: Document[];
  invoices?: Invoice[];
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface QuotationItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer?: Customer;
  status: QuotationStatus;
  origin?: string;
  destination?: string;
  serviceType?: ServiceType;
  cargoDetails?: string;
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  currency: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  createdBy?: string;
  items: QuotationItem[];
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  shipmentId?: string;
  shipment?: Shipment;
  status: InvoiceStatus;
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  dueDate: string;
  paidAt?: string;
  notes?: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'CUSTOMS_DUTY'
  | 'TRANSPORTATION'
  | 'PORT_HANDLING'
  | 'STORAGE_DEMURRAGE'
  | 'DOCUMENTATION'
  | 'INSURANCE'
  | 'SUPPLIER_PAYMENT'
  | 'MISCELLANEOUS';

export interface Expense {
  id: string;
  shipmentId?: string;
  shipment?: { shipmentNumber: string };
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  amountInSAR: number;
  vendorName?: string;
  receiptUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  documentType: string;
  entityType: string;
  entityId: string;
  notes?: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  activeShipments: number;
  deliveredShipments: number;
  pendingShipments: number;
  delayedShipments: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  outstandingInvoices: number;
  activeQuotations: number;
}

export interface ChartData {
  shipmentsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  expensesByMonth: { month: string; expenses: number }[];
  shipmentsByStatus: { status: string; count: number }[];
  serviceTypeDistribution: { serviceType: string; count: number }[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  user?: { fullName: string; email: string };
  action: string;
  entity?: string;
  entityId?: string;
  description?: string;
  createdAt: string;
}

export type SupplierInvoiceStatus = 'SUBMITTED' | 'REVIEWED';

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  shipmentId?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: SupplierInvoiceStatus;
  notes?: string | null;
  storagePath: string;
  originalName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; companyName: string };
  shipment?: { id: string; shipmentNumber: string } | null;
  uploadedBy?: { id: string; name: string; email: string };
}

export interface SupplierInvoiceSummary {
  invoiceCount: number;
  totalAmount: number;
  totalVat: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
