import React, { useEffect, useState } from 'react';
import { FolderArchive, Upload, FileText, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Document, Shipment } from '../../types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [entityId, setEntityId] = useState('');
  const [documentType, setDocumentType] = useState('BILL_OF_LADING');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents');
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    api.get('/shipments?limit=100').then((res) => {
      if (res.data.success) setShipments(res.data.data);
    });
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('entityType', 'shipment');
      formData.append('entityId', entityId);
      formData.append('documentType', documentType);
      formData.append('notes', notes);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Document uploaded successfully');
      setIsModalOpen(false);
      setSelectedFile(null);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Document Vault</h1>
          <p className="text-xs text-slate-400 mt-1">
            Store and manage Bills of Lading, Air Waybills, Customs Clearance Declarations, and Commercial Invoices
          </p>
        </div>
        <Button variant="primary" icon={Upload} onClick={() => setIsModalOpen(true)}>
          Upload Document
        </Button>
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FolderArchive className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No documents stored</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 border-b border-dark-border">
                <tr>
                  <th className="p-4">File Name</th>
                  <th className="p-4">Document Type</th>
                  <th className="p-4">Associated Entity</th>
                  <th className="p-4 font-mono">Size</th>
                  <th className="p-4 font-mono">Date Uploaded</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      <span className="truncate max-w-xs">{doc.originalName}</span>
                    </td>
                    <td className="p-4 font-mono text-accent-400">{doc.documentType.replace(/_/g, ' ')}</td>
                    <td className="p-4 text-slate-300 capitalize font-mono">
                      {doc.entityType} ({doc.entityId ? doc.entityId.substring(0, 8) : 'N/A'})
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={`/uploads/${doc.fileName}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Document File">
        <form onSubmit={handleUpload} className="space-y-4">
          <Select
            label="Associate with Shipment"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            options={[
              { value: '', label: '-- None / Standalone --' },
              ...shipments.map((s) => ({ value: s.id, label: `${s.shipmentNumber} (${s.origin} -> ${s.destination})` })),
            ]}
          />
          <Select
            label="Document Category *"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            options={[
              { value: 'BILL_OF_LADING', label: 'Bill of Lading / AWB' },
              { value: 'CUSTOMS_DECLARATION', label: 'Customs Declaration Bayan' },
              { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice' },
              { value: 'PACKING_LIST', label: 'Packing List' },
              { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin' },
              { value: 'DELIVERY_ORDER', label: 'Delivery Order' },
              { value: 'RECEIPT', label: 'Expense Receipt' },
            ]}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase">Select File (PDF, JPG, PNG, DOCX) *</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-500/20 file:text-primary-300 hover:file:bg-primary-500/30 bg-slate-900/60 p-2 rounded-xl border border-dark-border"
              required
            />
          </div>
          <Input
            label="Notes / Description"
            placeholder="e.g. Stamped original customs clearance declaration"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Start Upload
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
