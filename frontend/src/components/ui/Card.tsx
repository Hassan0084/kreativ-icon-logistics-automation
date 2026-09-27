import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  headerIcon?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerIcon,
}) => {
  return (
    <div
      className={`bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-all hover:border-slate-700/60 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-dark-border/60">
          <div className="flex items-center gap-3">
            {headerIcon && (
              <div className="p-2.5 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-400">
                {headerIcon}
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
