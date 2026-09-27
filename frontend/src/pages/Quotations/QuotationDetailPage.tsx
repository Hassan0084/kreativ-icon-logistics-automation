import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Download, Send, Edit, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Quotation } from '../../types';

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuotation = async () => {
    try {
      const res = await api.get(`/quotations/${id}`);
      if (res.data.success) {
        setQuotation(res.data.data);
      }
    } catch {
      toast.error('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchQuotation();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!quotation) return;
    try {
      const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quotation.quotationNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success('Downloaded PDF');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await api.patch(`/quotations/${id}/status`, { status });
      toast.success(`Status updated to ${status}`);
      fetchQuotation();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading quotation...</p>
      </div>
    );
  }

  if (!quotation) return null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/quotations')} variant="outline" size="sm" icon={ArrowLeft}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-white">{quotation.quotationNumber}</h1>
              <Badge variant="purple">{quotation.status}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Customer: {quotation.customer?.companyName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          {quotation.status === 'DRAFT' && (
            <Button variant="primary" size="sm" icon={Send} onClick={() => handleStatusChange('SENT')}>
              Mark as Sent
            </Button>
          )}
          {quotation.status === 'SENT' && (
            <Button variant="accent" size="sm" icon={CheckCircle} onClick={() => handleStatusChange('ACCEPTED')}>
              Accept Quotation
            </Button>
          )}
        </div>
      </div>

      <Card title="Quotation Summary" headerIcon={<FileText className="w-5 h-5" />}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-dark-border/60 pb-4">
            <div>
              <span className="text-slate-400 uppercase font-mono text-[10px] block">Customer</span>
              <span className="font-semibold text-white">{quotation.customer?.companyName}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-mono text-[10px] block">Valid Until</span>
              <span className="font-mono text-slate-200">
                {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-mono text-[10px] block">Route</span>
              <span className="font-semibold text-white">
                {quotation.origin && quotation.destination ? `${quotation.origin} -> ${quotation.destination}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-mono text-[10px] block">Grand Total</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                SAR {quotation.grandTotal?.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Items table */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-300 mb-2">Itemized Charges</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {quotation.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="p-3 text-white">{item.description}</td>
                      <td className="p-3 text-center font-mono">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">SAR {item.unitPrice?.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-semibold text-white">SAR {item.total?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
