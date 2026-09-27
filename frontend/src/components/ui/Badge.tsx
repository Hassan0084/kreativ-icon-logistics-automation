import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const variantClasses = {
    primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
    secondary: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    purple: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 animate-pulse" />
      {children}
    </span>
  );
};
