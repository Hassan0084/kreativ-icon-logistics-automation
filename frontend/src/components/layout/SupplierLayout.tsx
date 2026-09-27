import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, FileText, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Shell for external supplier accounts. Deliberately minimal and separate from
 * the internal `Layout` so a supplier can never see internal navigation.
 */
export const SupplierLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-dark text-slate-100 font-sans antialiased flex flex-col">
      <header className="border-b border-dark-border bg-dark-card/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/95 rounded-xl px-3 py-1.5 shadow-lg border border-white/20 shrink-0">
              <img src="/logo.png" alt="Kreativ Icon" className="h-6 w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary-400 shrink-0" />
                Supplier Portal
              </p>
              {user?.supplierName && (
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {user.supplierName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-slate-200 truncate max-w-[180px]">
                {user?.fullName}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-primary-400 font-mono">
                Supplier
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-dark-border text-slate-300 hover:bg-dark-border/50 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-dark-border/60 py-4 text-center">
        <p className="text-[11px] text-slate-500">
          Kreativ Icon Logistics &middot; Supplier Invoice Submission
        </p>
      </footer>
    </div>
  );
};

export default SupplierLayout;
