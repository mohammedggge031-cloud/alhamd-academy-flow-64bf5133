import { useState, useMemo } from "react";

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize = 50 } = options;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  // Reset to page 1 when items change significantly
  const safeSetPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
  };

  return {
    page,
    setPage: safeSetPage,
    totalPages,
    paginatedItems,
    pageSize,
    totalItems: items.length,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
