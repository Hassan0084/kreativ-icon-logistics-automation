import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  ExternalLink,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import { Notification } from '../../types';

interface HeaderProps {
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        if (response.data.success) {
          setNotifications(response.data.data);
          setUnreadCount(response.data.data.filter((n: Notification) => !n.isRead).length);
        }
      } catch {
        // ignore
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-16 bg-dark-card/90 border-b border-dark-border px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
      {/* Left section: Public Tracking link */}
      <div className="flex items-center gap-4">
        <Link
          to="/track"
          target="_blank"
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-accent-400 bg-slate-900/60 border border-dark-border px-3 py-1.5 rounded-xl transition-all hover:border-accent-500/40"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Public Tracking Portal</span>
        </Link>
      </div>

      {/* Right section: Search button, Notifications, User Menu */}
      <div className="flex items-center gap-3">
        {/* Search trigger icon for mobile/desktop shortcut */}
        <button
          onClick={onOpenSearch}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          title="Search (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-500 ring-4 ring-dark-card animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-4 z-50 animate-scale-up">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-dark-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Notifications</h4>
                <span className="text-[10px] text-accent-400 font-mono">{unreadCount} unread</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        n.isRead
                          ? 'bg-slate-900/30 border-transparent text-slate-400'
                          : 'bg-primary-950/20 border-primary-500/30 text-slate-200 hover:border-primary-500/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-white">{n.title}</span>
                        {!n.isRead && <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{n.message}</p>
                      <span className="text-[9px] text-slate-500 block mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-dark-border mx-1" />

        {/* Profile Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-accent-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{user?.fullName}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-2 z-50 animate-scale-up">
              <div className="px-3 py-2 border-b border-dark-border/60">
                <p className="text-xs font-bold text-white">{user?.fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-accent-400 font-mono uppercase bg-accent-500/10 px-2 py-0.5 rounded border border-accent-500/20">
                  <Shield className="w-3 h-3" /> {user?.role}
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Account Settings
                </Link>
              </div>

              <div className="pt-1 border-t border-dark-border/60">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
