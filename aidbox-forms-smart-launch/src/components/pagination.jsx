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
import { useSearchParams } from "react-router-dom";

export const Pagination = ({ currentPage, totalPages }) => {
  const [searchParams] = useSearchParams();

  const withPage = (page) => {
    searchParams.set("page", page);
    return `?${searchParams}`;
  };

  if (totalPages <= 1) {
    return null;
  }

  const paginationData = calculatePagination(currentPage, totalPages);

  return (
    <Pagination_ className="mt-4">
      <PaginationContent>
        {paginationData.prevButtonEnabled && (
          <PaginationItem>
            <PaginationPrevious to={withPage(currentPage - 1)} />
          </PaginationItem>
        )}

        {paginationData.showFirstPageButton && (
          <PaginationItem>
            <PaginationLink to={withPage(1)}>{1}</PaginationLink>
          </PaginationItem>
        )}

        {paginationData.showFirstEllipsis && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {paginationData.pagesBeforeCurrent.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink to={withPage(page)}>{page}</PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationLink isActive>{currentPage}</PaginationLink>
        </PaginationItem>

        {paginationData.pagesAfterCurrent.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink to={withPage(page)}>{page}</PaginationLink>
          </PaginationItem>
        ))}

        {paginationData.showLastEllipsis && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {paginationData.showLastPageButton && (
          <PaginationItem>
            <PaginationLink to={withPage(totalPages)}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}

        {paginationData.nextButtonEnabled && (
          <PaginationItem>
            <PaginationNext to={withPage(currentPage + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination_>
  );
};
