import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isInternalRole } from './types';
import Layout from './components/layout/Layout';
import SupplierLayout from './components/layout/SupplierLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ShipmentsPage from './pages/Shipments/ShipmentsPage';
import ShipmentDetailPage from './pages/Shipments/ShipmentDetailPage';
import ShipmentFormPage from './pages/Shipments/ShipmentFormPage';
import CustomersPage from './pages/Customers/CustomersPage';
import CustomerDetailPage from './pages/Customers/CustomerDetailPage';
import CustomerFormPage from './pages/Customers/CustomerFormPage';
import SuppliersPage from './pages/Suppliers/SuppliersPage';
import CarriersPage from './pages/Carriers/CarriersPage';
import QuotationsPage from './pages/Quotations/QuotationsPage';
import QuotationFormPage from './pages/Quotations/QuotationFormPage';
import QuotationDetailPage from './pages/Quotations/QuotationDetailPage';
import InvoicesPage from './pages/Invoices/InvoicesPage';
import InvoiceFormPage from './pages/Invoices/InvoiceFormPage';
import InvoiceDetailPage from './pages/Invoices/InvoiceDetailPage';
import ExpensesPage from './pages/Expenses/ExpensesPage';
import DocumentsPage from './pages/Documents/DocumentsPage';
import ReportsPage from './pages/Reports/ReportsPage';
import UsersPage from './pages/Users/UsersPage';
import SettingsPage from './pages/Settings/SettingsPage';
import TrackingPage from './pages/Tracking/TrackingPage';
import SupplierInvoicesPage from './pages/Supplier/SupplierInvoicesPage';
import NotFoundPage from './pages/NotFound';

const LoadingScreen = () => (
  <div className="min-h-screen bg-dark flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-dark-muted text-sm">Loading...</p>
    </div>
  </div>
);

/** Where a user should land after signing in, based on their role. */
export const homeForRole = (role?: string | null): string =>
  role === 'SUPPLIER' ? '/supplier/invoices' : '/';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // Suppliers have their own shell and must not reach internal pages.
  if (!isInternalRole(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return <>{children}</>;
};

/**
 * The supplier portal shell is for SUPPLIER accounts only. Staff review
 * submissions from inside the internal `Layout` at `/supplier-invoices`, so
 * they keep the staff navigation; routing them here would strand them in a
 * shell with no way back. Record scoping is enforced on the server.
 */
const SupplierRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'SUPPLIER') {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? <>{children}</> : <Navigate to={homeForRole(user.role)} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1A1A2E', color: '#fff', border: '1px solid #2D2D4E' }, success: { iconTheme: { primary: '#C026D3', secondary: '#fff' } } }} />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/track" element={<TrackingPage />} />
          <Route path="/track/:shipmentNumber" element={<TrackingPage />} />

          {/* Supplier routes — separate shell, no internal navigation */}
          <Route
            path="/supplier"
            element={
              <SupplierRoute>
                <SupplierLayout />
              </SupplierRoute>
            }
          >
            <Route index element={<Navigate to="/supplier/invoices" replace />} />
            <Route path="invoices" element={<SupplierInvoicesPage />} />
          </Route>

          {/* Protected internal routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="shipments/new" element={<ShipmentFormPage />} />
            <Route path="shipments/:id" element={<ShipmentDetailPage />} />
            <Route path="shipments/:id/edit" element={<ShipmentFormPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="customers/:id/edit" element={<CustomerFormPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="carriers" element={<CarriersPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="quotations/new" element={<QuotationFormPage />} />
            <Route path="quotations/:id" element={<QuotationDetailPage />} />
            <Route path="quotations/:id/edit" element={<QuotationFormPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceFormPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
            <Route path="supplier-invoices" element={<SupplierInvoicesPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
