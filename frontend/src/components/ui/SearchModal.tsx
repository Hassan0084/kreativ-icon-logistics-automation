import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Users, FileText, Receipt, ArrowRight } from 'lucide-react';
import api from '../../api/client';
import { Modal } from './Modal';
import { Shipment, Customer, Invoice, Quotation } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResults {
  shipments: Shipment[];
  customers: Customer[];
  invoices: Invoice[];
  quotations: Quotation[];
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
        if (response.data.success) {
          setResults(response.data.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shipments, customers, invoices, quotations..."
            autoFocus
            className="w-full bg-slate-900/60 text-white placeholder-slate-500 rounded-xl pl-12 pr-4 py-3 border border-dark-border focus:outline-none focus:border-primary-500 text-base shadow-inner"
          />
        </div>

        {loading && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Searching system records...
          </div>
        )}

        {!loading && results && (
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {/* Shipments */}
            {results.shipments?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-primary-400" /> Shipments ({results.shipments.length})
                </h4>
                <div className="space-y-1">
                  {results.shipments.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelect(`/shipments/${s.id}`)}
                      className="p-3 bg-dark-card/60 hover:bg-slate-800/80 rounded-xl border border-dark-border/50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <span className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                          {s.shipmentNumber}
                        </span>
                        <span className="text-xs text-slate-400 ml-2 font-mono">{s.awbBlNumber || s.containerNumber || ''}</span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.origin} &rarr; {s.destination} ({s.customer?.companyName || 'N/A'})
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customers */}
            {results.customers?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-accent-400" /> Customers ({results.customers.length})
                </h4>
                <div className="space-y-1">
                  {results.customers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelect(`/customers/${c.id}`)}
                      className="p-3 bg-dark-card/60 hover:bg-slate-800/80 rounded-xl border border-dark-border/50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <span className="font-semibold text-white group-hover:text-accent-400 transition-colors">
                          {c.companyName}
                        </span>
                        <span className="text-xs text-slate-400 ml-2 font-mono">{c.customerId}</span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {c.contactPerson} ({c.email || c.phone || 'No contact info'})
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-accent-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoices */}
            {results.invoices?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-400" /> Invoices ({results.invoices.length})
                </h4>
                <div className="space-y-1">
                  {results.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelect(`/invoices/${inv.id}`)}
                      className="p-3 bg-dark-card/60 hover:bg-slate-800/80 rounded-xl border border-dark-border/50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {inv.invoiceNumber}
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {inv.customer?.companyName} &bull; SAR {inv.grandTotal.toLocaleString()} &bull; Status: {inv.status}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quotations */}
            {results.quotations?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" /> Quotations ({results.quotations.length})
                </h4>
                <div className="space-y-1">
                  {results.quotations.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => handleSelect(`/quotations/${q.id}`)}
                      className="p-3 bg-dark-card/60 hover:bg-slate-800/80 rounded-xl border border-dark-border/50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <span className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                          {q.quotationNumber}
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {q.customer?.companyName} &bull; SAR {q.grandTotal.toLocaleString()}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!results.shipments?.length &&
              !results.customers?.length &&
              !results.invoices?.length &&
              !results.quotations?.length && (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No records match "{query}"
                </div>
              )}
          </div>
        )}
      </div>
    </Modal>
  );
};
