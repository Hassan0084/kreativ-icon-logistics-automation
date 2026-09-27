import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Building2,
  FileText,
  Receipt,
  FileStack,
  DollarSign,
  FolderArchive,
  BarChart3,
  UserCog,
  Settings,
  Search,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  onOpenSearch: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSearch }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'OPERATIONS', 'SALES', 'FINANCE', 'VIEWER'] },
    { name: 'Shipments', href: '/shipments', icon: Package, roles: ['ADMIN', 'MANAGER', 'OPERATIONS', 'SALES', 'FINANCE', 'VIEWER'] },
    { name: 'Customers', href: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'OPERATIONS', 'SALES', 'FINANCE', 'VIEWER'] },
    { name: 'Carriers', href: '/carriers', icon: Truck, roles: ['ADMIN', 'MANAGER', 'OPERATIONS', 'SALES', 'FINANCE', 'VIEWER'] },
    { name: 'Suppliers', href: '/suppliers', icon: Building2, roles: ['ADMIN', 'MANAGER', 'OPERATIONS', 'SALES', 'FINANCE', 'VIEWER'] },
    { name: 'Quotations', href: '/quotations', icon: FileText, roles: ['ADMIN', 'MANAGER', 'SALES', 'FINANCE', 'VIEWER'] },
    { name: 'Supplier Invoices', href: '/supplier-invoices', icon: FileStack, roles: ['ADMIN', 'MANAGER', 'FINANCE'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'FINANCE'] },
    { name: 'User Management', href: '/users', icon: UserCog, roles: ['ADMIN'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
  ];

  const filteredNav = navigation.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-dark-card border-r border-dark-border flex flex-col h-screen sticky top-0 z-30 select-none">
      <div className="p-4 border-b border-dark-border/60 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-white/95 hover:bg-white rounded-xl px-3.5 py-2 shadow-xl shadow-slate-950/60 border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-primary-500/20">
            <img src="/logo.png" alt="Kreativ Icon" className="h-7 w-auto object-contain" />
          </div>
        </Link>
      </div>

      {/* Global Quick Search Button */}
      <div className="px-4 py-3">
        <button
          onClick={onOpenSearch}
          className="w-full bg-slate-900/80 hover:bg-slate-900 border border-dark-border/80 hover:border-primary-500/50 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-all duration-200 shadow-inner group"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary-400 group-hover:scale-110 transition-transform" />
            <span>Search system...</span>
          </span>
          <kbd className="bg-dark-border/70 text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-primary-600/20 via-primary-500/10 to-transparent text-primary-300 border border-primary-500/30 shadow-md shadow-primary-950/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-primary-400'
                      : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary-400" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile Mini Card */}
      <div className="p-4 border-t border-dark-border/60 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'User'}</p>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-primary-500/20 text-primary-300 border border-primary-500/30">
              {user?.role || 'VIEWER'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
