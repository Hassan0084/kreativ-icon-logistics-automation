import React, { useState } from 'react';
import { Settings, Lock, User, Bell, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System & Account Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage personal profile preferences and security credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="User Account Profile" headerIcon={<User className="w-5 h-5 text-primary-400" />}>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block uppercase font-mono text-[10px]">Full Name</span>
              <span className="font-semibold text-white">{user?.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-mono text-[10px]">Email Address</span>
              <span className="font-semibold text-slate-200">{user?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-mono text-[10px]">System Access Role</span>
              <span className="font-mono text-accent-400 font-bold">{user?.role}</span>
            </div>
          </div>
        </Card>

        <Card title="Security & Password" headerIcon={<Lock className="w-5 h-5 text-rose-400" />}>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
