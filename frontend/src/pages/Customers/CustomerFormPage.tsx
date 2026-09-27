import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Saudi Arabia',
    taxNumber: '',
    customerType: 'CORPORATE',
    notes: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      api.get(`/customers/${id}`).then((res) => {
        if (res.data.success) {
          const c = res.data.data;
          setFormData({
            companyName: c.companyName || '',
            contactPerson: c.contactPerson || '',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            city: c.city || '',
            country: c.country || 'Saudi Arabia',
            taxNumber: c.taxNumber || '',
            customerType: c.customerType || 'CORPORATE',
            notes: c.notes || '',
          });
        }
        setFetching(false);
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) {
      toast.error('Company Name is required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, formData);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', formData);
        toast.success('Customer added');
      }
      navigate('/customers');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button onClick={() => navigate('/customers')} variant="outline" size="sm" icon={ArrowLeft}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isEdit ? 'Edit Customer Profile' : 'New Customer Registration'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Enter contact and tax information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Company Information" headerIcon={<Users className="w-5 h-5" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company / Client Name *"
              placeholder="e.g. Al-Futtaim Logistics Co."
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
            />
            <Select
              label="Customer Type *"
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              options={[
                { value: 'CORPORATE', label: 'Corporate' },
                { value: 'INDIVIDUAL', label: 'Individual' },
                { value: 'GOVERNMENT', label: 'Government' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Input
              label="Contact Person"
              placeholder="e.g. Ahmed Al-Mansoor"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. ahmed@alfuttaim.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +966 50 123 4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </Card>

        <Card title="Address & Tax Details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Address"
              placeholder="e.g. King Fahd Road, Suite 402"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Input
              label="City"
              placeholder="e.g. Riyadh"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>

          <div className="mt-4">
            <Input
              label="VAT / Tax Number"
              placeholder="e.g. 300495829400003"
              value={formData.taxNumber}
              onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/customers')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={Save}>
            Save Customer
          </Button>
        </div>
      </form>
    </div>
  );
}
