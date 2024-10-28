import { calculatePagination } from "@/lib/utils.js";
import {
  Pagination as Pagination_,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/ui/pagination.jsx";
import * as React from "react";

export const Pagination = ({ currentPage, totalPages }) => {
  if (totalPages <= 1) {
    return null;
  }

  const paginationData = calculatePagination(currentPage, totalPages);

  return (
    <Pagination_ className="mt-4">
      <PaginationContent>
        {paginationData.prevButtonEnabled && (
          <PaginationItem>
            <PaginationPrevious to={`?page=${currentPage - 1}`} />
          </PaginationItem>
        )}

        {paginationData.showFirstPageButton && (
          <PaginationItem>
            <PaginationLink to={`?page=1`}>{1}</PaginationLink>
          </PaginationItem>
        )}

        {paginationData.showFirstEllipsis && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {paginationData.pagesBeforeCurrent.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink to={`?page=${page}`}>{page}</PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationLink isActive>{currentPage}</PaginationLink>
        </PaginationItem>

        {paginationData.pagesAfterCurrent.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink to={`?page=${page}`}>{page}</PaginationLink>
          </PaginationItem>
        ))}

        {paginationData.showLastEllipsis && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {paginationData.showLastPageButton && (
          <PaginationItem>
            <PaginationLink to={`?page=${totalPages}`}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}

        {paginationData.nextButtonEnabled && (
          <PaginationItem>
            <PaginationNext to={`?page=${currentPage + 1}`} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination_>
  );
};
