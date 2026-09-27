import React, { useEffect, useState } from 'react';
import { BarChart3, Download, TrendingUp, Package, DollarSign, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function ReportsPage() {
  const [revenueData, setRevenueData] = useState<any>(null);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [revRes, shipRes] = await Promise.all([
          api.get('/reports/revenue'),
          api.get('/reports/shipments'),
        ]);
        if (revRes.data.success) setRevenueData(revRes.data.data);
        if (shipRes.data.success) setShipmentData(shipRes.data.data);
      } catch {
        toast.error('Failed to load operational reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleExportCSV = async (reportType: string) => {
    try {
      const res = await api.get(`/reports/${reportType}?format=csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.csv`);
      document.body.appendChild(link);
      link.click();
      toast.success(`Exported ${reportType}_report.csv`);
    } catch {
      toast.error('CSV export failed');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Building system reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Business Reports</h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyze company financial performance, shipment volumes, and customer yield
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Shipment Volume Report" headerIcon={<Package className="w-5 h-5 text-primary-400" />}>
          <p className="text-xs text-slate-400 mb-4">Export detailed consignment log with customer details and profit margins.</p>
          <Button variant="outline" size="sm" icon={Download} onClick={() => handleExportCSV('shipments')} className="w-full">
            Export Shipments CSV
          </Button>
        </Card>

        <Card title="Financial Revenue Report" headerIcon={<TrendingUp className="w-5 h-5 text-emerald-400" />}>
          <p className="text-xs text-slate-400 mb-4">Export monthly breakdown of billed invoices, revenue, and collection status.</p>
          <Button variant="outline" size="sm" icon={Download} onClick={() => handleExportCSV('revenue')} className="w-full">
            Export Revenue CSV
          </Button>
        </Card>

        <Card title="Expense Breakdown Report" headerIcon={<DollarSign className="w-5 h-5 text-rose-400" />}>
          <p className="text-xs text-slate-400 mb-4">Export itemized vendor payments, port charges, and duty disbursements.</p>
          <Button variant="outline" size="sm" icon={Download} onClick={() => handleExportCSV('expenses')} className="w-full">
            Export Expenses CSV
          </Button>
        </Card>
      </div>

      {revenueData && (
        <Card title="Monthly Financial Summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-dark-border">
              <span className="text-slate-400 uppercase text-[10px] block">Total Invoiced Revenue</span>
              <span className="text-2xl font-bold text-emerald-400">SAR {revenueData.totalRevenue?.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-xl border border-dark-border">
              <span className="text-slate-400 uppercase text-[10px] block">Average Invoice Value</span>
              <span className="text-2xl font-bold text-accent-300">SAR {revenueData.averageInvoiceValue?.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
