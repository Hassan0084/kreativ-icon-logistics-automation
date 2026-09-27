import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Receipt, ArrowLeft, Download, DollarSign, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Invoice } from '../../types';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data.success) {
        setInvoice(res.data.data);
        setPaymentAmount(res.data.data.balanceAmount || 0);
      }
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success('Downloaded PDF');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    setSubmittingPayment(true);
    try {
      await api.patch(`/invoices/${id}/status`, { paymentAmount });
      toast.success('Payment recorded successfully!');
      setIsPaymentModalOpen(false);
      fetchInvoice();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/invoices')} variant="outline" size="sm" icon={ArrowLeft}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-white">{invoice.invoiceNumber}</h1>
              <Badge variant={invoice.status === 'PAID' ? 'success' : 'amber'}>{invoice.status}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Customer: {invoice.customer?.companyName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          {invoice.status !== 'PAID' && (
            <Button variant="primary" size="sm" icon={DollarSign} onClick={() => setIsPaymentModalOpen(true)}>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Invoice Financials" headerIcon={<Receipt className="w-5 h-5 text-emerald-400" />}>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between pb-2 border-b border-dark-border">
              <span className="text-slate-400">Grand Total:</span>
              <span className="font-mono font-bold text-white">SAR {invoice.grandTotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-dark-border">
              <span className="text-slate-400">Paid Amount:</span>
              <span className="font-mono font-bold text-emerald-400">SAR {invoice.paidAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Balance Due:</span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                SAR {invoice.balanceAmount?.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Line Items" className="lg:col-span-2">
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
                {invoice.items?.map((item, i) => (
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
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <p className="text-xs text-slate-400">
            Remaining balance for this invoice is <strong className="text-rose-300">SAR {invoice.balanceAmount?.toLocaleString()}</strong>
          </p>

          <Input
            label="Payment Amount Received (SAR) *"
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
            required
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingPayment}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
