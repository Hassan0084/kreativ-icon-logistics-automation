import React, { useEffect, useState } from 'react';
import { UserCog, Plus, Shield, Mail, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { User } from '../../types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'OPERATIONS',
    phone: '',
  });

  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch {
      toast.error('Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Email, Password, and Full Name are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users', formData);
      toast.success('User account created');
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setSubmitting(true);
    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, { newPassword });
      toast.success(`Password reset for ${selectedUser.fullName}`);
      setIsResetModalOpen(false);
      setNewPassword('');
    } catch {
      toast.error('Reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System User Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage staff accounts, assign RBAC system roles, and reset passwords
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
          Create User Account
        </Button>
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading user accounts...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 uppercase font-bold text-slate-400 border-b border-dark-border">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4 font-mono">Last Login</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white">
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-white block">{u.fullName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="purple">{u.role}</Badge>
                    </td>
                    <td className="p-4 text-slate-300 font-mono">{u.phone || 'N/A'}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsResetModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Staff Account">
        <form onSubmit={handleAddUser} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Tariq Al-Sayed"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
          <Input
            label="Email Address *"
            type="email"
            placeholder="e.g. tariq@kreativicon.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Password *"
            type="password"
            placeholder="••••••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <Select
            label="System Access Role *"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'ADMIN', label: 'Admin (Full System Access)' },
              { value: 'MANAGER', label: 'Manager (Operations & Approvals)' },
              { value: 'OPERATIONS', label: 'Operations Specialist' },
              { value: 'SALES', label: 'Sales & Quotations' },
              { value: 'FINANCE', label: 'Finance & Invoicing' },
              { value: 'VIEWER', label: 'Read Only Viewer' },
            ]}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title={`Reset Password: ${selectedUser?.fullName}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="New Password *"
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save New Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
