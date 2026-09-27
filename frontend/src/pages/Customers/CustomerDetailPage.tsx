import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Users, Mail, Phone, MapPin, Building, ArrowLeft, Edit, Package, Receipt, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Customer } from '../../types';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await api.get(`/customers/${id}`);
        if (response.data.success) {
          setCustomer(response.data.data);
        }
      } catch {
        toast.error('Failed to load customer');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading Customer Profile...</p>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/customers')} variant="outline" size="sm" icon={ArrowLeft}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{customer.companyName}</h1>
              <Badge variant="purple">{customer.customerType}</Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono">ID: {customer.customerId}</p>
          </div>
        </div>

        <Link to={`/customers/${customer.id}/edit`}>
          <Button variant="primary" size="sm" icon={Edit}>
            Edit Profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Contact Profile & Details" headerIcon={<Users className="w-5 h-5 text-accent-400" />}>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block uppercase font-mono text-[10px]">Contact Person</span>
              <span className="font-semibold text-white">{customer.contactPerson || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-mono text-[10px]">Email Address</span>
              <span className="font-semibold text-slate-200">{customer.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-mono text-[10px]">Phone Number</span>
              <span className="font-semibold text-slate-200">{customer.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-mono text-[10px]">Address</span>
              <span className="text-slate-300">{customer.address || 'N/A'}, {customer.city}, {customer.country}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-mono text-[10px]">Tax Number (VAT / CR)</span>
              <span className="font-mono text-slate-200">{customer.taxNumber || 'N/A'}</span>
            </div>
          </div>
        </Card>

        <Card title="Activity Summary" className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-dark-border">
              <Package className="w-6 h-6 text-primary-400 mx-auto mb-2" />
              <p className="text-2xl font-bold font-mono text-white">{customer._count?.shipments || 0}</p>
              <p className="text-xs text-slate-400 uppercase mt-1 font-mono">Total Shipments</p>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-dark-border">
              <Receipt className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold font-mono text-white">{customer._count?.invoices || 0}</p>
              <p className="text-xs text-slate-400 uppercase mt-1 font-mono">Total Invoices</p>
            </div>
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-dark-border">
              <FileText className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold font-mono text-white">{customer._count?.quotations || 0}</p>
              <p className="text-xs text-slate-400 uppercase mt-1 font-mono">Quotations</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
