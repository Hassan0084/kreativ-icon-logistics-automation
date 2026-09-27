import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, Filter, Eye, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Shipment, ShipmentStatus } from '../../types';

export default function ShipmentsPage() {
  const [searchParams] = useSearchParams();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(searchParams.get('delayed') ? 'IN_TRANSIT' : '');
  const [serviceType, setServiceType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { q: search }),
        ...(status && { status }),
        ...(serviceType && { serviceType }),
      });
      const response = await api.get(`/shipments?${params.toString()}`);
      if (response.data.success) {
        setShipments(response.data.data);
        setTotalPages(response.data.pagination.pages);
        setTotalItems(response.data.pagination.total);
      }
    } catch {
      toast.error('Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [page, status, serviceType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchShipments();
  };

  const getStatusBadge = (s: ShipmentStatus) => {
    switch (s) {
      case 'DELIVERED':
        return <Badge variant="success">DELIVERED</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="info">IN TRANSIT</Badge>;
      case 'OUT_FOR_DELIVERY':
        return <Badge variant="purple">OUT FOR DELIVERY</Badge>;
      case 'CUSTOMS_HOLD':
      case 'ON_HOLD':
        return <Badge variant="warning">{s.replace('_', ' ')}</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="secondary">{s.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Shipment Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track, update, and manage freight consignments across air, sea, and land
          </p>
        </div>
        <Link to="/shipments/new">
          <Button variant="primary" icon={Plus}>
            New Shipment
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <Card className="!p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            placeholder="Search shipment #, AWB, Container, Booking..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'BOOKED', label: 'Booked' },
              { value: 'PICKUP_PENDING', label: 'Pickup Pending' },
              { value: 'PICKED_UP', label: 'Picked Up' },
              { value: 'IN_TRANSIT', label: 'In Transit' },
              { value: 'CUSTOMS_HOLD', label: 'Customs Hold' },
              { value: 'CUSTOMS_CLEARED', label: 'Customs Cleared' },
              { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
          <Select
            value={serviceType}
            onChange={(e) => {
              setServiceType(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Modes / Services' },
              { value: 'AIR_FREIGHT', label: 'Air Freight' },
              { value: 'SEA_FREIGHT_FCL', label: 'Sea Freight FCL' },
              { value: 'SEA_FREIGHT_LCL', label: 'Sea Freight LCL' },
              { value: 'LAND_FREIGHT', label: 'Land Freight' },
              { value: 'CUSTOMS_CLEARANCE', label: 'Customs Clearance' },
              { value: 'WAREHOUSING', label: 'Warehousing' },
            ]}
          />
          <Button type="submit" variant="secondary" icon={Filter}>
            Filter
          </Button>
        </form>
      </Card>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading shipments...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No shipments found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting search filters or create a new shipment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 border-b border-dark-border">
                <tr>
                  <th className="p-4">Shipment #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Selling Price</th>
                  <th className="p-4 text-right">Profit</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">
                      <Link to={`/shipments/${s.id}`} className="hover:text-primary-400">
                        {s.shipmentNumber}
                      </Link>
                      {s.awbBlNumber && <span className="block text-[10px] text-slate-400 font-mono font-normal">BL: {s.awbBlNumber}</span>}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-200">{s.customer?.companyName || 'N/A'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 font-medium">
                        <span>{s.origin}</span>
                        <span className="text-slate-500">&rarr;</span>
                        <span>{s.destination}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {s.serviceType.replace(/_/g, ' ')}
                    </td>
                    <td className="p-4">{getStatusBadge(s.status)}</td>
                    <td className="p-4 text-right font-mono text-white">
                      SAR {s.sellingPrice?.toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono font-semibold text-emerald-400">
                      SAR {s.profit?.toLocaleString()} ({s.profitMargin?.toFixed(1)}%)
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/shipments/${s.id}`}>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link to={`/shipments/${s.id}/edit`}>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-primary-400 hover:bg-slate-700 transition-colors" title="Edit Shipment">
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
