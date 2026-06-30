import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Client-side pagination over an array. */
export function usePagination(items, pageSize = 10) {
  const [page, setPage] = React.useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return { page: current, setPage, pageItems, totalPages, total, pageSize, start };
}

export default function Pagination({ page, totalPages, total, pageSize, start, setPage, className = "" }) {
  if (totalPages <= 1) return null;
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, total);
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground border-t ${className}`}>
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <span className="px-1">Page {page} / {totalPages}</span>
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
