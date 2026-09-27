import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package, ArrowLeft, Save, Building, Truck, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Customer, Carrier, Supplier } from '../../types';

export default function ShipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [formData, setFormData] = useState({
    customerId: '',
    serviceType: 'AIR_FREIGHT',
    origin: '',
    destination: '',
    originPort: '',
    destinationPort: '',
    awbBlNumber: '',
    containerNumber: '',
    bookingNumber: '',
    etd: '',
    eta: '',
    freightCost: 0,
    sellingPrice: 0,
    numberOfPackages: 1,
    weight: 0,
    volume: 0,
    cargoDescription: '',
    carrierId: '',
    supplierId: '',
    notes: '',
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [custRes, carrRes, suppRes] = await Promise.all([
          api.get('/customers?limit=100'),
          api.get('/carriers?limit=100'),
          api.get('/suppliers?limit=100'),
        ]);

        if (custRes.data.success) setCustomers(custRes.data.data);
        if (carrRes.data.success) setCarriers(carrRes.data.data);
        if (suppRes.data.success) setSuppliers(suppRes.data.data);

        if (isEdit && id) {
          const shipRes = await api.get(`/shipments/${id}`);
          if (shipRes.data.success) {
            const s = shipRes.data.data;
            setFormData({
              customerId: s.customerId || '',
              serviceType: s.serviceType || 'AIR_FREIGHT',
              origin: s.origin || '',
              destination: s.destination || '',
              originPort: s.originPort || '',
              destinationPort: s.destinationPort || '',
              awbBlNumber: s.awbBlNumber || '',
              containerNumber: s.containerNumber || '',
              bookingNumber: s.bookingNumber || '',
              etd: s.etd ? new Date(s.etd).toISOString().substring(0, 10) : '',
              eta: s.eta ? new Date(s.eta).toISOString().substring(0, 10) : '',
              freightCost: s.freightCost || 0,
              sellingPrice: s.sellingPrice || 0,
              numberOfPackages: s.numberOfPackages || 1,
              weight: s.weight || 0,
              volume: s.volume || 0,
              cargoDescription: s.cargoDescription || '',
              carrierId: s.carrierId || '',
              supplierId: s.supplierId || '',
              notes: s.notes || '',
            });
          }
        }
      } catch {
        toast.error('Failed to load initial form data');
      } finally {
        setFetching(false);
      }
    };

    fetchOptions();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.origin || !formData.destination) {
      toast.error('Customer, Origin, and Destination are required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/shipments/${id}`, formData);
        toast.success('Shipment updated successfully');
      } else {
        await api.post('/shipments', formData);
        toast.success('Shipment created successfully!');
      }
      navigate('/shipments');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save shipment');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading form...</p>
      </div>
    );
  }

  const profit = Number(formData.sellingPrice) - Number(formData.freightCost);
  const profitMargin = formData.sellingPrice > 0 ? (profit / formData.sellingPrice) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button onClick={() => navigate('/shipments')} variant="outline" size="sm" icon={ArrowLeft}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isEdit ? 'Edit Shipment' : 'Create New Consignment'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Fill in customer, routing, costs, and transport carrier specifications
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Service Mode */}
        <Card title="Client & Mode Selection" headerIcon={<Package className="w-5 h-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Customer / Client *"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              options={[
                { value: '', label: '-- Select Customer --' },
                ...customers.map((c) => ({ value: c.id, label: `${c.companyName} (${c.customerId})` })),
              ]}
              required
            />

            <Select
              label="Service Mode *"
              value={formData.serviceType}
              onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              options={[
                { value: 'AIR_FREIGHT', label: 'Air Freight' },
                { value: 'SEA_FREIGHT_FCL', label: 'Sea Freight FCL' },
                { value: 'SEA_FREIGHT_LCL', label: 'Sea Freight LCL' },
                { value: 'LAND_FREIGHT', label: 'Land Freight' },
                { value: 'CUSTOMS_CLEARANCE', label: 'Customs Clearance' },
                { value: 'WAREHOUSING', label: 'Warehousing' },
                { value: 'DOOR_TO_DOOR', label: 'Door to Door' },
              ]}
            />
          </div>
        </Card>

        {/* Route Details */}
        <Card title="Routing & Schedule Details" headerIcon={<Truck className="w-5 h-5 text-accent-400" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Origin City / Country *"
              placeholder="e.g. Shanghai, China"
              value={formData.origin}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              required
            />
            <Input
              label="Destination City / Country *"
              placeholder="e.g. Riyadh, Saudi Arabia"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              required
            />
            <Input
              label="Origin Port / Terminal"
              placeholder="e.g. PVG Airport / Port of Shanghai"
              value={formData.originPort}
              onChange={(e) => setFormData({ ...formData, originPort: e.target.value })}
            />
            <Input
              label="Destination Port / Terminal"
              placeholder="e.g. King Khalid Airport / Dammam Port"
              value={formData.destinationPort}
              onChange={(e) => setFormData({ ...formData, destinationPort: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <Input
              label="AWB / Bill of Lading #"
              placeholder="e.g. 172-9840294"
              value={formData.awbBlNumber}
              onChange={(e) => setFormData({ ...formData, awbBlNumber: e.target.value })}
            />
            <Input
              label="Container #"
              placeholder="e.g. MSKU9204859"
              value={formData.containerNumber}
              onChange={(e) => setFormData({ ...formData, containerNumber: e.target.value })}
            />
            <Input
              label="Booking Ref #"
              placeholder="e.g. BK-2026-009"
              value={formData.bookingNumber}
              onChange={(e) => setFormData({ ...formData, bookingNumber: e.target.value })}
            />
            <Input
              label="ETD (Estimated Departure)"
              type="date"
              value={formData.etd}
              onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
            />
            <Input
              label="ETA (Estimated Arrival)"
              type="date"
              value={formData.eta}
              onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
            />
          </div>
        </Card>

        {/* Financials & Carrier Selection */}
        <Card title="Financials & Suppliers" headerIcon={<DollarSign className="w-5 h-5 text-emerald-400" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Freight Cost (SAR) *"
              type="number"
              step="0.01"
              value={formData.freightCost}
              onChange={(e) => setFormData({ ...formData, freightCost: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Selling Price (SAR) *"
              type="number"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
              required
            />
            <div className="p-3 bg-slate-900/60 rounded-xl border border-dark-border flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Calculated Profit</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                SAR {profit.toLocaleString()} ({profitMargin.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Select
              label="Carrier / Shipping Line"
              value={formData.carrierId}
              onChange={(e) => setFormData({ ...formData, carrierId: e.target.value })}
              options={[
                { value: '', label: '-- None / Direct --' },
                ...carriers.map((c) => ({ value: c.id, label: `${c.companyName} (${c.carrierType})` })),
              ]}
            />
            <Select
              label="Supplier / Handling Agent"
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              options={[
                { value: '', label: '-- None / Direct --' },
                ...suppliers.map((s) => ({ value: s.id, label: s.companyName })),
              ]}
            />
          </div>
        </Card>

        {/* Cargo Specs */}
        <Card title="Cargo Specifications">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Packages Count"
              type="number"
              value={formData.numberOfPackages}
              onChange={(e) => setFormData({ ...formData, numberOfPackages: parseInt(e.target.value) || 1 })}
            />
            <Input
              label="Gross Weight (KG)"
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Volume (CBM)"
              type="number"
              step="0.01"
              value={formData.volume}
              onChange={(e) => setFormData({ ...formData, volume: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Cargo Description"
              placeholder="e.g. Industrial Machinery Parts & Electronics"
              value={formData.cargoDescription}
              onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={() => navigate('/shipments')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={Save}>
            {isEdit ? 'Update Shipment' : 'Create & Generate Shipment #'}
          </Button>
        </div>
      </form>
    </div>
  );
}
