import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search, Eye, Edit, Download, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Quotation } from '../../types';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { q: search }),
        ...(status && { status }),
      });
      const res = await api.get(`/quotations?${params.toString()}`);
      if (res.data.success) {
        setQuotations(res.data.data);
        setTotalPages(res.data.pagination.pages);
      }
    } catch {
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, status]);

  const handleDownloadPDF = async (id: string, num: string) => {
    try {
      const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${num}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success(`Downloaded ${num}.pdf`);
    } catch {
      toast.error('PDF download failed');
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'ACCEPTED':
        return <Badge variant="success">ACCEPTED</Badge>;
      case 'SENT':
        return <Badge variant="info">SENT</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED</Badge>;
      case 'EXPIRED':
        return <Badge variant="warning">EXPIRED</Badge>;
      default:
        return <Badge variant="secondary">DRAFT</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales Quotations</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, manage, and convert formal freight rate quotes for clients
          </p>
        </div>
        <Link to="/quotations/new">
          <Button variant="primary" icon={Plus}>
            Create Quotation
          </Button>
        </Link>
      </div>

      <Card className="!p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search quotation #, customer..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'SENT', label: 'Sent' },
              { value: 'ACCEPTED', label: 'Accepted' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
          />
          <Button variant="secondary" onClick={() => fetchQuotations()}>
            Filter
          </Button>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading quotations...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No quotations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 border-b border-dark-border">
                <tr>
                  <th className="p-4">Quotation #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Route / Service</th>
                  <th className="p-4 text-right">Grand Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 font-mono">Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">
                      <Link to={`/quotations/${q.id}`} className="hover:text-primary-400">
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td className="p-4 font-semibold text-slate-200">{q.customer?.companyName || 'N/A'}</td>
                    <td className="p-4 text-[11px] text-slate-400">
                      {q.origin && q.destination ? `${q.origin} -> ${q.destination}` : q.serviceType || 'General Freight'}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-amber-400">
                      SAR {q.grandTotal?.toLocaleString()}
                    </td>
                    <td className="p-4">{getStatusBadge(q.status)}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/quotations/${q.id}`}>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDownloadPDF(q.id, q.quotationNumber)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-accent-400 hover:bg-slate-700 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
      </Card>
    </div>
  );
}
