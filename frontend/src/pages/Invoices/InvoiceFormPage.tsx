import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Receipt, ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Customer, Shipment, InvoiceItem } from '../../types';

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    shipmentId: '',
    discount: 0,
    vatRate: 15,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    notes: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Freight Services Charge', quantity: 1, unitPrice: 3500, total: 3500 },
  ]);

  useEffect(() => {
    Promise.all([api.get('/customers?limit=100'), api.get('/shipments?limit=100')]).then(
      ([custRes, shipRes]) => {
        if (custRes.data.success) setCustomers(custRes.data.data);
        if (shipRes.data.success) setShipments(shipRes.data.data);
      }
    );

    if (isEdit && id) {
      api.get(`/invoices/${id}`).then((res) => {
        if (res.data.success) {
          const inv = res.data.data;
          setFormData({
            customerId: inv.customerId || '',
            shipmentId: inv.shipmentId || '',
            discount: inv.discount || 0,
            vatRate: inv.vatRate || 15,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().substring(0, 10) : '',
            notes: inv.notes || '',
          });
          if (inv.items?.length > 0) setItems(inv.items);
        }
      });
    }
  }, [id, isEdit]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      item.total = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  const vatAmount = ((subtotal - Number(formData.discount)) * Number(formData.vatRate)) / 100;
  const grandTotal = subtotal - Number(formData.discount) + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error('Customer is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        items,
      };

      if (isEdit) {
        await api.put(`/invoices/${id}`, payload);
        toast.success('Invoice updated');
      } else {
        await api.post('/invoices', payload);
        toast.success('Invoice created');
      }
      navigate('/invoices');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button onClick={() => navigate('/invoices')} variant="outline" size="sm" icon={ArrowLeft}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isEdit ? 'Edit Tax Invoice' : 'Create Tax Invoice'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Generate compliant VAT tax invoices for freight services</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Invoice Header Information" headerIcon={<Receipt className="w-5 h-5 text-emerald-400" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Select Customer *"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              options={[
                { value: '', label: '-- Choose Customer --' },
                ...customers.map((c) => ({ value: c.id, label: c.companyName })),
              ]}
              required
            />
            <Select
              label="Link to Shipment (Optional)"
              value={formData.shipmentId}
              onChange={(e) => setFormData({ ...formData, shipmentId: e.target.value })}
              options={[
                { value: '', label: '-- Direct Invoice --' },
                ...shipments.map((s) => ({ value: s.id, label: `${s.shipmentNumber} (${s.origin} -> ${s.destination})` })),
              ]}
            />
            <Input
              label="Payment Due Date *"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>
        </Card>

        <Card title="Itemized Charges">
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-900/40 p-3 rounded-xl border border-dark-border">
                <div className="sm:col-span-6">
                  <Input
                    label={idx === 0 ? 'Description' : ''}
                    placeholder="Invoice charge item"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={idx === 0 ? 'Qty' : ''}
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={idx === 0 ? 'Unit Price (SAR)' : ''}
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between gap-2">
                  <div className="text-right flex-1">
                    {idx === 0 && <span className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Total</span>}
                    <span className="font-mono font-bold text-white text-sm">SAR {item.total?.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>
              Add Charge Line
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-dark-border/60 max-w-sm ml-auto space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-white">SAR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>VAT ({formData.vatRate}%):</span>
              <span className="font-mono text-slate-300">SAR {vatAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-dark-border text-emerald-400">
              <span>Grand Total:</span>
              <span className="font-mono">SAR {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/invoices')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={Save}>
            Save Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}
