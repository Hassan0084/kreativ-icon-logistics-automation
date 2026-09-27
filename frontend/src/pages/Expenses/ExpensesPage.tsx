import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Expense, Shipment } from '../../types';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    shipmentId: '',
    category: 'CUSTOMS_DUTY',
    description: '',
    amount: 0,
    currency: 'SAR',
    exchangeRate: 1.0,
    vendorName: '',
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(category && { category }),
      });
      const res = await api.get(`/expenses?${params.toString()}`);
      if (res.data.success) {
        setExpenses(res.data.data);
        setTotalPages(res.data.pagination.pages);
      }
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    api.get('/shipments?limit=100').then((res) => {
      if (res.data.success) setShipments(res.data.data);
    });
  }, [page, category]);

  const handleOpenAdd = () => {
    setFormData({
      shipmentId: '',
      category: 'CUSTOMS_DUTY',
      description: '',
      amount: 0,
      currency: 'SAR',
      exchangeRate: 1.0,
      vendorName: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || formData.amount <= 0) {
      toast.error('Description and positive amount are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/expenses', formData);
      toast.success('Expense recorded');
      setIsModalOpen(false);
      fetchExpenses();
    } catch {
      toast.error('Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Expense Tracking</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track job operational costs, customs duties, port handling, and vendor charges
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Log Expense
        </Button>
      </div>

      <Card className="!p-4">
        <div className="flex gap-3">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: '', label: 'All Expense Categories' },
              { value: 'CUSTOMS_DUTY', label: 'Customs Duty' },
              { value: 'TRANSPORTATION', label: 'Transportation' },
              { value: 'PORT_HANDLING', label: 'Port Handling' },
              { value: 'STORAGE_DEMURRAGE', label: 'Storage / Demurrage' },
              { value: 'DOCUMENTATION', label: 'Documentation' },
              { value: 'INSURANCE', label: 'Insurance' },
              { value: 'SUPPLIER_PAYMENT', label: 'Supplier Payment' },
              { value: 'MISCELLANEOUS', label: 'Miscellaneous' },
            ]}
          />
          <Button variant="secondary" onClick={() => fetchExpenses()}>
            Filter
          </Button>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No expenses recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 border-b border-dark-border">
                <tr>
                  <th className="p-4">Category</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Shipment #</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4 text-right">Amount (SAR)</th>
                  <th className="p-4 font-mono">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-xs font-semibold text-accent-400">
                      {exp.category.replace('_', ' ')}
                    </td>
                    <td className="p-4 font-medium text-white">{exp.description}</td>
                    <td className="p-4 font-mono text-primary-400">
                      {exp.shipment?.shipmentNumber || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-300">{exp.vendorName || 'N/A'}</td>
                    <td className="p-4 text-right font-mono font-bold text-rose-300">
                      SAR {exp.amountInSAR?.toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {new Date(exp.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log New Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Shipment Reference (Optional)"
            value={formData.shipmentId}
            onChange={(e) => setFormData({ ...formData, shipmentId: e.target.value })}
            options={[
              { value: '', label: '-- General Overhead --' },
              ...shipments.map((s) => ({ value: s.id, label: `${s.shipmentNumber} (${s.origin} -> ${s.destination})` })),
            ]}
          />
          <Select
            label="Category *"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            options={[
              { value: 'CUSTOMS_DUTY', label: 'Customs Duty' },
              { value: 'TRANSPORTATION', label: 'Transportation' },
              { value: 'PORT_HANDLING', label: 'Port Handling' },
              { value: 'STORAGE_DEMURRAGE', label: 'Storage / Demurrage' },
              { value: 'DOCUMENTATION', label: 'Documentation' },
              { value: 'INSURANCE', label: 'Insurance' },
              { value: 'SUPPLIER_PAYMENT', label: 'Supplier Payment' },
              { value: 'MISCELLANEOUS', label: 'Miscellaneous' },
            ]}
          />
          <Input
            label="Description *"
            placeholder="e.g. Jeddah Port Gate Fee & Customs Bay Duty"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <Input
            label="Vendor / Payee Name"
            placeholder="e.g. Mawani Port Authority"
            value={formData.vendorName}
            onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
          />
          <Input
            label="Amount (SAR) *"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            required
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
