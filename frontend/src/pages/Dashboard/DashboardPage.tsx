import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  Plus,
  ArrowRight,
  Truck,
  Activity,
} from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DashboardStats, ChartData, Shipment, ActivityLog } from '../../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [upcoming, setUpcoming] = useState<Shipment[]>([]);
  const [delayed, setDelayed] = useState<Shipment[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, chartsRes, upcomingRes, delayedRes, activityRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/charts'),
          api.get('/dashboard/upcoming-deliveries'),
          api.get('/dashboard/delayed-shipments'),
          api.get('/dashboard/recent-activity'),
        ]);

        if (statsRes.data.success) setStats(statsRes.data.data);
        if (chartsRes.data.success) setCharts(chartsRes.data.data);
        if (upcomingRes.data.success) setUpcoming(upcomingRes.data.data);
        if (delayedRes.data.success) setDelayed(delayedRes.data.data);
        if (activityRes.data.success) setActivity(activityRes.data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading Dashboard Metrics...</p>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'success';
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'info';
      case 'CUSTOMS_HOLD':
      case 'ON_HOLD':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Title + Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Operations Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics, freight activity, and operational statistics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/shipments/new">
            <Button variant="primary" icon={Plus} size="sm">
              New Shipment
            </Button>
          </Link>
          <Link to="/quotations/new">
            <Button variant="accent" icon={FileText} size="sm">
              Create Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1: Active Shipments */}
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:scale-110 transition-transform text-primary-400">
            <Package className="w-16 h-16" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Shipments</p>
          <p className="text-3xl font-extrabold text-white mt-2 font-mono">{stats?.activeShipments || 0}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-dark-border/60">
            <span>Delivered: <strong className="text-emerald-400">{stats?.deliveredShipments || 0}</strong></span>
            <span>Pending: <strong className="text-amber-400">{stats?.pendingShipments || 0}</strong></span>
          </div>
        </Card>

        {/* Card 2: Delayed Shipments Warning */}
        <Card className="relative overflow-hidden group border-rose-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:scale-110 transition-transform text-rose-400">
            <AlertTriangle className="w-16 h-16" />
          </div>
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Delayed Shipments</p>
          <p className="text-3xl font-extrabold text-rose-400 mt-2 font-mono">{stats?.delayedShipments || 0}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-dark-border/60">
            <span>Quotations: <strong className="text-sky-300">{stats?.activeQuotations || 0} active</strong></span>
            <Link to="/shipments?delayed=true" className="text-rose-400 hover:underline">View All &rarr;</Link>
          </div>
        </Card>
      </div>

      {/* Middle Section: Upcoming Deliveries & Delayed Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deliveries */}
        <Card title="Upcoming Deliveries (Next 7 Days)" headerIcon={<Truck className="w-5 h-5" />}>
          {upcoming.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-8">No shipments scheduled for delivery in next 7 days</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-dark-card/40 border border-dark-border/50 rounded-xl flex items-center justify-between hover:border-primary-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <Link to={`/shipments/${s.id}`} className="font-semibold text-xs text-white hover:text-primary-400 font-mono">
                        {s.shipmentNumber}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {s.customer?.companyName} &bull; {s.origin} &rarr; {s.destination}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusBadgeVariant(s.status)} size="sm">
                      {s.status}
                    </Badge>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      ETA: {s.eta ? new Date(s.eta).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Delayed Shipments */}
        <Card title="Delayed Shipments Alert" headerIcon={<AlertTriangle className="w-5 h-5 text-rose-400" />}>
          {delayed.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 opacity-80" />
              <span>All active shipments are currently on schedule!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {delayed.map((s: any) => (
                <div
                  key={s.id}
                  className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <Link to={`/shipments/${s.id}`} className="font-semibold text-xs text-rose-300 hover:underline font-mono">
                      {s.shipmentNumber}
                    </Link>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {s.customer?.companyName} &bull; {s.origin} &rarr; {s.destination}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {s.daysDelayed} days delayed
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      ETA was: {s.eta ? new Date(s.eta).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Activity Log */}
      <Card title="Recent Activity Audit Trail" headerIcon={<Activity className="w-5 h-5 text-accent-400" />}>
        {activity.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-6">No recent activity logs available</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {activity.map((a) => (
              <div
                key={a.id}
                className="p-2.5 bg-slate-900/40 rounded-xl border border-dark-border/40 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold font-mono">
                    {a.user?.fullName?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium">
                      <span className="font-semibold text-white">{a.user?.fullName || 'System'}</span>{' '}
                      <span className="text-primary-300">{a.action}</span>{' '}
                      <span className="text-slate-400">{a.description || ''}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(a.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
