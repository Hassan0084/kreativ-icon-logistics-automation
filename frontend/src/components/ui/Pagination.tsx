import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border mt-4">
      {totalItems !== undefined && (
        <p className="text-xs text-slate-400">
          Showing page <span className="font-medium text-white">{currentPage}</span> of{' '}
          <span className="font-medium text-white">{totalPages}</span> ({totalItems} total items)
        </p>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={ChevronLeft}
        >
          Previous
        </Button>

        <span className="text-xs font-semibold px-3 py-1 bg-dark-card border border-dark-border rounded-lg text-slate-300">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          icon={ChevronRight}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
