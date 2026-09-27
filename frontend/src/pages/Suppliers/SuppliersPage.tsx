import React, { useEffect, useState } from 'react';
import { Building2, Plus, Search, Mail, Phone, MapPin, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Supplier } from '../../types';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    country: 'Saudi Arabia',
    serviceProvided: '',
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { q: search }),
      });
      const res = await api.get(`/suppliers?${params.toString()}`);
      if (res.data.success) {
        setSuppliers(res.data.data);
        setTotalPages(res.data.pagination.pages);
      }
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [page]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      country: 'Saudi Arabia',
      serviceProvided: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      companyName: s.companyName,
      contactPerson: s.contactPerson || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      country: s.country || 'Saudi Arabia',
      serviceProvided: s.serviceProvided || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) {
      toast.error('Company Name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier added');
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Suppliers & Handling Vendors</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage customs clearance agents, port handling vendors, and local warehouses
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Supplier
        </Button>
      </div>

      <Card className="!p-4">
        <div className="flex gap-3">
          <Input
            placeholder="Search suppliers by company name, service..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="secondary" onClick={() => fetchSuppliers()}>
            Search
          </Button>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading vendors...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No suppliers listed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 border-b border-dark-border">
                <tr>
                  <th className="p-4">Vendor Company</th>
                  <th className="p-4">Contact Person</th>
                  <th className="p-4">Service Provided</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">{s.companyName}</td>
                    <td className="p-4 text-slate-300">{s.contactPerson || 'N/A'}</td>
                    <td className="p-4 font-mono text-primary-300">{s.serviceProvided || 'General Logistics'}</td>
                    <td className="p-4 text-[11px] text-slate-400">
                      {s.email} {s.phone && `(${s.phone})`}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-400 hover:bg-slate-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Company Name *"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
          />
          <Input
            label="Service Provided"
            placeholder="e.g. Customs Brokerage / Port Transport"
            value={formData.serviceProvided}
            onChange={(e) => setFormData({ ...formData, serviceProvided: e.target.value })}
          />
          <Input
            label="Contact Person"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
