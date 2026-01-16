import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollToTop?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  scrollToTop = true,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="bg-white dark:bg-gray-800"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-1 text-gray-500 dark:text-gray-400"
              >
                ...
              </span>
            );
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(page as number)}
              className={
                currentPage === page
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-white dark:bg-gray-800"
              }
            >
              {page}
            </Button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="bg-white dark:bg-gray-800"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
