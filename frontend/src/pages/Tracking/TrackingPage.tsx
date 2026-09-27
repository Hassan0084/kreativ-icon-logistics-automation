import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, Package, MapPin, Clock, CheckCircle2, Sparkles, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function TrackingPage() {
  const { shipmentNumber: paramNum } = useParams<{ shipmentNumber: string }>();
  const navigate = useNavigate();
  const [queryNum, setQueryNum] = useState(paramNum || '');
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async (num: string) => {
    if (!num.trim()) return;
    setLoading(true);
    setError('');
    setTrackingData(null);
    try {
      const res = await api.get(`/tracking/${encodeURIComponent(num.trim())}`);
      if (res.data.success) {
        setTrackingData(res.data.data);
      }
    } catch {
      setError(`No shipment found matching "${num}". Please check the shipment number and try again.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramNum) {
      fetchTracking(paramNum);
    }
  }, [paramNum]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryNum) {
      navigate(`/track/${encodeURIComponent(queryNum.trim())}`);
      fetchTracking(queryNum);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-accent-600/15 rounded-full blur-[130px] pointer-events-none" />

      <header className="px-6 py-4 flex items-center justify-between border-b border-dark-border/60 bg-dark-card/60 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="group">
            <div className="bg-white/95 hover:bg-white rounded-xl px-3.5 py-1.5 shadow-md shadow-slate-950/40 border border-white/20 flex items-center justify-center transition-all group-hover:scale-105">
              <img src="/logo.png" alt="Kreativ Icon" className="h-7 w-auto object-contain" />
            </div>
          </Link>
          <div className="hidden sm:block pl-3 border-l border-dark-border/60">
            <h1 className="font-extrabold text-white text-xs tracking-tight uppercase">Public Cargo Tracking</h1>
            <p className="text-[10px] text-accent-400 font-mono">Kreativ Icon Automation Portal</p>
          </div>
        </div>

        <Link to="/login">
          <Button variant="outline" size="sm">
            Staff Portal Sign In &rarr;
          </Button>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 relative z-10 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-primary-200 tracking-tight">
            Track Your Consignment
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Enter your Kreativ Icon shipment reference number to check real-time milestone progress, current location, and ETA.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto pt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. KIC-20260914-0001"
                value={queryNum}
                onChange={(e) => setQueryNum(e.target.value)}
                className="w-full bg-slate-900/90 text-white placeholder-slate-500 rounded-2xl pl-12 pr-4 py-3.5 border border-dark-border focus:outline-none focus:border-primary-500 font-mono text-sm shadow-xl"
              />
            </div>
            <Button type="submit" variant="primary" loading={loading} icon={ArrowRight} className="py-3.5 px-6">
              Track
            </Button>
          </form>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs text-center max-w-xl mx-auto">
            {error}
          </div>
        )}

        {trackingData && (
          <div className="space-y-6 animate-fade-in">
            <Card className="!p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dark-border/60">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold font-mono text-white">{trackingData.shipmentNumber}</h3>
                    <Badge variant="primary">{trackingData.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Client: <strong className="text-white">{trackingData.customer?.companyName || 'Corporate Client'}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono text-xs">
                  <span className="text-slate-400 block uppercase text-[10px]">Estimated Arrival (ETA)</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {trackingData.eta ? new Date(trackingData.eta).toLocaleDateString() : 'In Transit'}
                  </span>
                </div>
              </div>

              {/* Route Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-dark-border/60 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-mono block">Origin</span>
                  <span className="font-semibold text-white">{trackingData.origin}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-mono block">Destination</span>
                  <span className="font-semibold text-white">{trackingData.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-mono block">Service Mode</span>
                  <span className="font-mono text-slate-300">{trackingData.serviceType}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-mono block">Packages / Weight</span>
                  <span className="font-mono text-slate-300">{trackingData.numberOfPackages || 1} Pkg / {trackingData.weight || 0} KG</span>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-400" /> Milestone Tracking Timeline
                </h4>
                {!trackingData.statusHistory || trackingData.statusHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No milestone history logged yet</p>
                ) : (
                  <div className="relative border-l-2 border-dark-border ml-3 space-y-6 my-2">
                    {trackingData.statusHistory.map((h: any, idx: number) => (
                      <div key={h.id || idx} className="relative pl-6">
                        <div
                          className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 ${
                            idx === 0
                              ? 'bg-primary-500 border-primary-400 ring-4 ring-primary-500/20'
                              : 'bg-dark-card border-slate-600'
                          }`}
                        />
                        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-dark-border/60">
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
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500 border-t border-dark-border/40 bg-dark-card/40 relative z-10">
        &copy; {new Date().getFullYear()} Kreativ Icon Automation System. All rights reserved.
      </footer>
    </div>
  );
}
