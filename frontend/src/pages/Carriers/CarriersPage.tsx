import React, { useEffect, useState } from 'react';
import { Truck, Plus, Search, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Carrier } from '../../types';

export default function CarriersPage() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    carrierType: 'SHIPPING_LINE',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
  });

  const fetchCarriers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { q: search }),
      });
      const res = await api.get(`/carriers?${params.toString()}`);
      if (res.data.success) {
        setCarriers(res.data.data);
        setTotalPages(res.data.pagination.pages);
      }
    } catch {
      toast.error('Failed to load carriers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarriers();
  }, [page]);

  const handleOpenAdd = () => {
    setEditingCarrier(null);
    setFormData({
      companyName: '',
      carrierType: 'SHIPPING_LINE',
      code: '',
      contactPerson: '',
      email: '',
      phone: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Carrier) => {
    setEditingCarrier(c);
    setFormData({
      companyName: c.companyName,
      carrierType: c.carrierType,
      code: c.code || '',
      contactPerson: c.contactPerson || '',
      email: c.email || '',
      phone: c.phone || '',
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
      if (editingCarrier) {
        await api.put(`/carriers/${editingCarrier.id}`, formData);
        toast.success('Carrier updated');
      } else {
        await api.post('/carriers', formData);
        toast.success('Carrier added');
      }
      setIsModalOpen(false);
      fetchCarriers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save carrier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Carriers & Freight Lines</h1>
          <p className="text-xs text-slate-400 mt-1">
            Shipping lines, airlines, trucking companies, and courier providers
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Carrier
        </Button>
      </div>

      <Card className="!p-4">
        <div className="flex gap-3">
          <Input
            placeholder="Search carriers by company or code..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="secondary" onClick={() => fetchCarriers()}>
            Search
          </Button>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading carriers...</p>
          </div>
        ) : carriers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No carriers registered</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 border-b border-dark-border">
                <tr>
                  <th className="p-4">Carrier Code</th>
                  <th className="p-4">Company Name</th>
                  <th className="p-4">Carrier Type</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {carriers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-accent-400">{c.code || 'N/A'}</td>
                    <td className="p-4 font-semibold text-white">{c.companyName}</td>
                    <td className="p-4">
                      <Badge variant="info">{c.carrierType.replace('_', ' ')}</Badge>
                    </td>
                    <td className="p-4 text-[11px] text-slate-400">
                      {c.contactPerson} {c.email && `(${c.email})`}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(c)}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCarrier ? 'Edit Carrier' : 'Add New Carrier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Carrier Name *"
            placeholder="e.g. Maersk Line / Saudia Cargo"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
          />
          <Select
            label="Carrier Type *"
            value={formData.carrierType}
            onChange={(e) => setFormData({ ...formData, carrierType: e.target.value as any })}
            options={[
              { value: 'SHIPPING_LINE', label: 'Shipping Line' },
              { value: 'AIRLINE', label: 'Airline' },
              { value: 'TRUCKING_COMPANY', label: 'Trucking Company' },
              { value: 'COURIER', label: 'Courier' },
            ]}
          />
          <Input
            label="IATA / SCAC Code"
            placeholder="e.g. MAEU / SV"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
              Save Carrier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
