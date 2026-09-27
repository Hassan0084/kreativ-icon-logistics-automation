import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User } from '../types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth', { email, password });
      if (response.data.success) {
        const user = response.data.data as User;
        login(response.data.token, user);
        toast.success(`Welcome back, ${user.fullName}!`);
        // Suppliers land in their own portal, everyone else in the dashboard.
        navigate(user.role === 'SUPPLIER' ? '/supplier/invoices' : '/', { replace: true });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-accent-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center bg-white/95 hover:bg-white rounded-2xl px-6 py-3.5 shadow-2xl shadow-slate-950/80 border border-white/30 mb-6 transition-all duration-300 hover:scale-105">
          <img src="/logo.png" alt="Kreativ Icon" className="h-10 w-auto object-contain" />
        </div>

        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-primary-200 tracking-tight">
          Logistics Management Portal
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to manage freight, customs, invoicing, and tracking
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-dark-card/90 border border-dark-border py-8 px-6 shadow-2xl rounded-3xl backdrop-blur-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@kreativicon.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3"
              loading={loading}
              icon={ArrowRight}
            >
              Sign In to System
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/track"
              className="text-xs text-accent-400 hover:text-accent-300 hover:underline flex items-center justify-center gap-1"
            >
              Customer Tracking Portal &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
