import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  MapPin,
  Building,
  Truck,
  DollarSign,
  FileText,
  Upload,
  CheckCircle,
  Plus,
  ArrowLeft,
  Calendar,
  Layers,
  Edit,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Shipment, ShipmentStatus } from '../../types';

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [statusLocation, setStatusLocation] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchShipment = async () => {
    try {
      const response = await api.get(`/shipments/${id}`);
      if (response.data.success) {
        setShipment(response.data.data);
        setNewStatus(response.data.data.status);
      }
    } catch {
      toast.error('Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchShipment();
  }, [id]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;

    setUpdatingStatus(true);
    try {
      const response = await api.post(`/shipments/${id}/status`, {
        status: newStatus,
        notes: statusNotes,
        location: statusLocation,
      });
      if (response.data.success) {
        toast.success('Shipment status updated & notification triggered');
        setIsStatusModalOpen(false);
        setStatusNotes('');
        setStatusLocation('');
        fetchShipment();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading Shipment Details...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-semibold">Shipment Not Found</p>
        <Button onClick={() => navigate('/shipments')} variant="secondary" className="mt-4" icon={ArrowLeft}>
          Back to Shipments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/shipments')} variant="outline" size="sm" icon={ArrowLeft}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-white font-mono tracking-tight">
                {shipment.shipmentNumber}
              </h1>
              <Badge variant="primary">{shipment.status}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customer: <strong className="text-white">{shipment.customer?.companyName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/track/${shipment.shipmentNumber}`} target="_blank">
            <Button variant="outline" size="sm" icon={ExternalLink}>
              Track Portal
            </Button>
          </Link>
          <Link to={`/shipments/${shipment.id}/edit`}>
            <Button variant="secondary" size="sm" icon={Edit}>
              Edit
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
            icon={CheckCircle}
          >
            Update Status
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Details, Right Financials & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <Card title="Consignment Information" headerIcon={<Package className="w-5 h-5" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">Service Type</span>
                <span className="font-semibold text-white font-mono">{shipment.serviceType}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">AWB / BL Number</span>
                <span className="font-semibold text-white font-mono">{shipment.awbBlNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">Container Number</span>
                <span className="font-semibold text-white font-mono">{shipment.containerNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">Booking Reference</span>
                <span className="font-semibold text-white font-mono">{shipment.bookingNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">Carrier</span>
                <span className="font-semibold text-white">{shipment.carrier?.companyName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">Supplier / Agent</span>
                <span className="font-semibold text-white">{shipment.supplier?.companyName || 'N/A'}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-dark-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">Origin</span>
                <span className="font-semibold text-white">{shipment.origin}</span>
                {shipment.originPort && <span className="block text-[10px] text-slate-500">{shipment.originPort}</span>}
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">Destination</span>
                <span className="font-semibold text-white">{shipment.destination}</span>
                {shipment.destinationPort && <span className="block text-[10px] text-slate-500">{shipment.destinationPort}</span>}
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">ETD</span>
                <span className="font-semibold text-white font-mono">
                  {shipment.etd ? new Date(shipment.etd).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-mono text-[10px]">ETA</span>
                <span className="font-semibold text-white font-mono">
                  {shipment.eta ? new Date(shipment.eta).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Status History Timeline */}
          <Card title="Status & Milestone Tracking History" headerIcon={<Clock className="w-5 h-5 text-accent-400" />}>
            {!shipment.statusHistory || shipment.statusHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No history recorded yet</p>
            ) : (
              <div className="relative border-l-2 border-dark-border ml-3 space-y-6 my-2">
                {shipment.statusHistory.map((h, idx) => (
                  <div key={h.id} className="relative pl-6">
                    {/* Dot */}
                    <div
                      className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 ${
                        idx === 0
                          ? 'bg-primary-500 border-primary-400 ring-4 ring-primary-500/20'
                          : 'bg-dark-card border-slate-600'
                      }`}
                    />
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-dark-border/60">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white uppercase tracking-wider font-mono">
                          {h.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(h.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {h.location && (
                        <p className="text-xs text-primary-300 mt-1 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5" /> {h.location}
                        </p>
                      )}
                      {h.notes && <p className="text-xs text-slate-300 mt-1">{h.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Profitability Breakdown & Expenses */}
        <div className="space-y-6">
          <Card title="Profitability Breakdown" headerIcon={<DollarSign className="w-5 h-5 text-emerald-400" />}>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-dark-border/60">
                <span className="text-slate-400">Selling Price (Revenue):</span>
                <span className="font-mono font-semibold text-white">SAR {shipment.sellingPrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-dark-border/60">
                <span className="text-slate-400">Freight Cost:</span>
                <span className="font-mono font-semibold text-rose-300">SAR {shipment.freightCost?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-dark-border/60">
                <span className="text-slate-400">Gross Profit:</span>
                <span className="font-mono font-bold text-emerald-400">SAR {shipment.profit?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">Profit Margin:</span>
                <span className="font-mono font-bold text-accent-400">{shipment.profitMargin?.toFixed(1)}%</span>
              </div>
            </div>
          </Card>

          {/* Associated Documents */}
          <Card
            title="Attached Documents"
            headerIcon={<FileText className="w-5 h-5 text-sky-400" />}
            action={
              <Link to="/documents">
                <Button variant="outline" size="sm" icon={Upload}>
                  Upload
                </Button>
              </Link>
            }
          >
            {!shipment.documents || shipment.documents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No documents attached</p>
            ) : (
              <div className="space-y-2">
                {shipment.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2 bg-slate-900/50 rounded-xl border border-dark-border flex items-center justify-between text-xs"
                  >
                    <span className="truncate text-slate-200">{doc.originalName}</span>
                    <a
                      href={`/uploads/${doc.fileName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-400 hover:underline text-[10px]"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Update Shipment Status">
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <Select
            label="New Status Milestone"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'BOOKED', label: 'Booked' },
              { value: 'PICKUP_PENDING', label: 'Pickup Pending' },
              { value: 'PICKED_UP', label: 'Picked Up' },
              { value: 'IN_TRANSIT', label: 'In Transit' },
              { value: 'CUSTOMS_HOLD', label: 'Customs Hold' },
              { value: 'CUSTOMS_CLEARED', label: 'Customs Cleared' },
              { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'ON_HOLD', label: 'On Hold' },
            ]}
          />

          <Input
            label="Current Location"
            placeholder="e.g. Jeddah Islamic Port / Warehouse / Transit Hub"
            value={statusLocation}
            onChange={(e) => setStatusLocation(e.target.value)}
            icon={MapPin}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase">Status Notes / Remarks</label>
            <textarea
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Add details regarding customs clearance, container inspection, or delivery notes..."
              className="w-full bg-dark-card text-white text-sm p-3 rounded-xl border border-dark-border focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={updatingStatus}>
              Save Status & Send Email Notification
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
