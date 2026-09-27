import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4 animate-bounce">
        <AlertTriangle className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-white">404 - Page Not Found</h1>
      <p className="text-sm text-slate-400 mt-2 max-w-md">
        The route or resource you are attempting to access does not exist or has been moved.
      </p>
      <Link to="/" className="mt-6">
        <Button variant="primary" icon={ArrowLeft}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
