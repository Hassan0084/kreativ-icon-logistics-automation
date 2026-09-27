import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Search, Eye, Edit, Mail, Phone, MapPin, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Customer } from '../../types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { q: search }),
        ...(customerType && { customerType }),
      });
      const response = await api.get(`/customers?${params.toString()}`);
      if (response.data.success) {
        setCustomers(response.data.data);
        setTotalPages(response.data.pagination.pages);
        setTotalItems(response.data.pagination.total);
      }
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, customerType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer Database</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage corporate, individual, and government client accounts
          </p>
        </div>
        <Link to="/customers/new">
          <Button variant="primary" icon={Plus}>
            Add Customer
          </Button>
        </Link>
      </div>

      <Card className="!p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search company, contact person, email, phone..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={customerType}
            onChange={(e) => {
              setCustomerType(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Customer Types' },
              { value: 'CORPORATE', label: 'Corporate' },
              { value: 'INDIVIDUAL', label: 'Individual' },
              { value: 'GOVERNMENT', label: 'Government' },
            ]}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No customer records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 border-b border-dark-border">
                <tr>
                  <th className="p-4">Customer ID</th>
                  <th className="p-4">Company / Name</th>
                  <th className="p-4">Contact Person</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-center">Shipments</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-accent-400">{c.customerId}</td>
                    <td className="p-4">
                      <Link to={`/customers/${c.id}`} className="font-semibold text-white hover:text-primary-400">
                        {c.companyName}
                      </Link>
                      <span className="block text-[10px] text-slate-400">{c.country}</span>
                    </td>
                    <td className="p-4 text-slate-200">{c.contactPerson || 'N/A'}</td>
                    <td className="p-4 space-y-0.5 text-slate-400 text-[11px]">
                      {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-500" /> {c.email}</div>}
                      {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" /> {c.phone}</div>}
                    </td>
                    <td className="p-4">
                      <Badge variant="purple">{c.customerType}</Badge>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-white">
                      {c._count?.shipments || 0}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/customers/${c.id}`}>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link to={`/customers/${c.id}/edit`}>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-primary-400 hover:bg-slate-700 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(p) => setPage(p)}
        />
      </Card>
    </div>
  );
}
