import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Receipt,
  Paperclip,
  X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { SupplierInvoice, SupplierInvoiceSummary, Supplier } from '../../types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];

const formatMoney = (amount: number, currency = 'SAR') =>
  new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface FormState {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: string;
  vatRate: string;
  total: string;
  currency: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  subtotal: '',
  vatRate: '15',
  total: '',
  currency: 'SAR',
  notes: '',
};

export const SupplierInvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [summary, setSummary] = useState<SupplierInvoiceSummary>({
    invoiceCount: 0,
    totalAmount: 0,
    totalVat: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Staff uploading on a supplier's behalf pick the supplier; a supplier is
  // always locked to their own record by the server.
  const isSupplier = user?.role === 'SUPPLIER';
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [suppliersError, setSuppliersError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupplier) return;
    api
      .get('/suppliers', { params: { limit: 100 } })
      .then((res) => {
        setSuppliers(res.data.data ?? []);
        setSuppliersError(null);
      })
      .catch((err) => {
        // Surface the reason: an empty dropdown with no explanation reads as
        // "no suppliers exist" and leaves staff unable to file an invoice.
        setSuppliers([]);
        setSuppliersError(
          err.response?.data?.message || 'Could not load the supplier list.'
        );
      });
  }, [isSupplier]);

  const loadInvoices = useCallback(async () => {
    try {
      const [listRes, sumRes] = await Promise.all([
        api.get('/supplier-invoices', { params: { page, limit: 10 } }),
        api.get('/supplier-invoices/summary'),
      ]);
      setInvoices(listRes.data.data ?? []);
      setTotalPages(listRes.data.pagination?.pages ?? 1);
      setTotalItems(listRes.data.pagination?.total ?? 0);
      setSummary(sumRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not load your invoices.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Derive the total from subtotal + VAT unless the supplier typed one explicitly.
  const derivedTotal = useCallback((): string => {
    if (form.total.trim()) return form.total;
    const subtotal = Number(form.subtotal);
    const rate = Number(form.vatRate || 0);
    if (!Number.isFinite(subtotal) || subtotal <= 0) return '';
    return (subtotal * (1 + rate / 100)).toFixed(2);
  }, [form.subtotal, form.vatRate, form.total]);

  const acceptFile = (candidate?: File | null) => {
    if (!candidate) return;
    const nameLower = candidate.name.toLowerCase();
    const extOk = ACCEPTED_EXT.some((ext) => nameLower.endsWith(ext));
    if (!extOk) {
      toast.error('Unsupported file type. Upload a PDF, JPG, PNG, WEBP or DOCX file.');
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      toast.error('File is larger than 10 MB.');
      return;
    }
    setFile(candidate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.invoiceNumber.trim()) {
      toast.error('Invoice number is required.');
      return;
    }
    if (!file) {
      toast.error('Please attach the invoice file.');
      return;
    }
    if (!form.subtotal.trim() && !form.total.trim()) {
      toast.error('Enter either a subtotal or a total amount.');
      return;
    }
    if (!isSupplier && !supplierId) {
      toast.error('Select the supplier this invoice belongs to.');
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('invoiceNumber', form.invoiceNumber.trim());
    body.append('invoiceDate', form.invoiceDate);
    if (form.dueDate) body.append('dueDate', form.dueDate);
    if (form.subtotal.trim()) body.append('subtotal', form.subtotal);
    body.append('vatRate', form.vatRate || '15');
    const total = derivedTotal();
    if (total) body.append('total', total);
    body.append('currency', form.currency);
    if (form.notes.trim()) body.append('notes', form.notes.trim());
    // Staff uploading on a supplier's behalf must state which supplier.
    if (!isSupplier && supplierId) {
      body.append('supplierId', supplierId);
    }

    setSubmitting(true);
    try {
      await api.post('/supplier-invoices', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Invoice submitted successfully.');
      setForm({ ...EMPTY_FORM, invoiceDate: new Date().toISOString().slice(0, 10) });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPage(1);
      await loadInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (invoice: SupplierInvoice) => {
    try {
      const res = await api.get(`/supplier-invoices/${invoice.id}/download`);
      window.open(res.data.data.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not open the invoice file.');
    }
  };

  const handleDelete = async (invoice: SupplierInvoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/supplier-invoices/${invoice.id}`);
      toast.success('Invoice deleted.');
      await loadInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not delete the invoice.');
    }
  };

  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {isSupplier ? 'My Invoices' : 'Supplier Invoices'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {isSupplier
            ? 'Submit invoices for goods or services provided to Kreativ Icon Logistics.'
            : 'Review invoices submitted by suppliers, or file one on their behalf.'}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-slate-400">Invoices Submitted</p>
          <p className="text-2xl font-bold text-white mt-1">{summary.invoiceCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Total VAT</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatMoney(summary.totalVat)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Total Billed</p>
          <p className="text-2xl font-bold text-primary-400 mt-1">
            {formatMoney(summary.totalAmount)}
          </p>
        </Card>
      </div>

      {/* Upload form */}
      <Card
        title="Submit an Invoice"
        subtitle="PDF, JPG, PNG, WEBP or DOCX — up to 10 MB"
        headerIcon={<Upload className="w-5 h-5" />}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {!isSupplier && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Supplier <span className="text-rose-400">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={!!suppliersError}
                  className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors disabled:opacity-60"
                >
                  <option value="">
                    {suppliersError
                      ? 'Could not load suppliers'
                      : suppliers.length === 0
                        ? 'No suppliers available'
                        : 'Select a supplier…'}
                  </option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
                {suppliersError && (
                  <p className="mt-1.5 text-[11px] text-rose-400">{suppliersError}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Invoice Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => setField('invoiceNumber', e.target.value)}
                placeholder="e.g. SUP-2026-0142"
                className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Invoice Date
              </label>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setField('invoiceDate', e.target.value)}
                className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Due Date <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setField('dueDate', e.target.value)}
                className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Subtotal (excl. VAT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.subtotal}
                onChange={(e) => setField('subtotal', e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">VAT %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.vatRate}
                onChange={(e) => setField('vatRate', e.target.value)}
                className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Total{' '}
                <span className="text-slate-500">
                  {form.total.trim() ? '(manual)' : '(auto)'}
                </span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.total || derivedTotal()}
                onChange={(e) => setField('total', e.target.value)}
                placeholder={derivedTotal() || '0.00'}
                className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setField('currency', e.target.value)}
                className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              >
                <option value="SAR">SAR — Saudi Riyal</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="CNY">CNY — Chinese Yuan</option>
                <option value="GBP">GBP — Pound Sterling</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Notes <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={2}
              placeholder="Payment details, PO reference, or anything we should know."
              className="w-full bg-slate-900/60 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-y"
            />
          </div>

          {/* File dropzone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Invoice File <span className="text-rose-400">*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                acceptFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragging
                  ? 'border-primary-500 bg-primary-500/10'
                  : file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-dark-border hover:border-primary-500/50 hover:bg-slate-900/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXT.join(',')}
                onChange={(e) => acceptFile(e.target.files?.[0])}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <Paperclip className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="ml-2 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-7 h-7 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-300">
                    Drop your invoice here, or <span className="text-primary-400">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Maximum file size 10 MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={submitting} icon={Upload}>
              Submit Invoice
            </Button>
          </div>
        </form>
      </Card>

      {/* History */}
      <Card
        title="Submitted Invoices"
        subtitle={loading ? 'Loading…' : `${totalItems} invoice${totalItems === 1 ? '' : 's'} on record`}
        headerIcon={<Receipt className="w-5 h-5" />}
      >
        {loading ? (
          <div className="py-10 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No invoices submitted yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Use the form above to submit your first invoice.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-dark-border hover:border-slate-700/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-white font-mono">
                      {invoice.invoiceNumber}
                    </span>
                    <Badge
                      size="sm"
                      variant={invoice.status === 'REVIEWED' ? 'success' : 'warning'}
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-3 flex-wrap">
                    <span>Date: {formatDate(invoice.invoiceDate)}</span>
                    {invoice.dueDate && <span>Due: {formatDate(invoice.dueDate)}</span>}
                    <span className="flex items-center gap-1 truncate max-w-[220px]">
                      <Paperclip className="w-3 h-3 shrink-0" />
                      {invoice.originalName} · {formatBytes(invoice.fileSize)}
                    </span>
                  </p>
                  {invoice.notes && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{invoice.notes}</p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-white">
                      {formatMoney(invoice.total, invoice.currency)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      incl. {formatMoney(invoice.vatAmount, invoice.currency)} VAT
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownload(invoice)}
                      title="Download"
                      className="p-2 rounded-lg text-slate-400 hover:text-primary-400 hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(invoice)}
                        title="Delete"
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && invoices.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        )}
      </Card>

      {!user?.supplierId && user?.role === 'SUPPLIER' && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200">
            Your account is not linked to a supplier record yet, so uploads will be rejected.
            Please ask your Kreativ Icon contact to link it.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupplierInvoicesPage;
