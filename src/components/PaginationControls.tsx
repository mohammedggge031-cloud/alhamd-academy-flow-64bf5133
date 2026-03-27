import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
}

const PaginationControls = ({ page, totalPages, totalItems, onPageChange, hasNext, hasPrev }: PaginationControlsProps) => {
  const { t } = useLanguage();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <p className="text-xs text-muted-foreground">
        {t("page")} {page} / {totalPages} ({totalItems} {t("total")})
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {totalPages <= 7 ? (
          Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => onPageChange(p)}>
              {p}
            </Button>
          ))
        ) : (
          <>
            <Button variant={page === 1 ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => onPageChange(1)}>1</Button>
            {page > 3 && <span className="text-xs text-muted-foreground px-1">...</span>}
            {Array.from({ length: 3 }, (_, i) => page - 1 + i).filter(p => p > 1 && p < totalPages).map(p => (
              <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => onPageChange(p)}>
                {p}
              </Button>
            ))}
            {page < totalPages - 2 && <span className="text-xs text-muted-foreground px-1">...</span>}
            <Button variant={page === totalPages ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </Button>
          </>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
