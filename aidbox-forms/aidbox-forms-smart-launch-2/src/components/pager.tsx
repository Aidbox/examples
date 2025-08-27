"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PagerProps {
  currentPage: number;
  totalPages: number;
}

function ButtonLink({
  href,
  children,
}: {
  href: string | undefined;
  children: React.ReactNode;
}) {
  return href ? (
    <Button variant="outline" size="sm" asChild>
      <Link href={href}>{children}</Link>
    </Button>
  ) : (
    <Button variant="outline" size="sm" disabled>
      {children}
    </Button>
  );
}

export function Pager({ currentPage, totalPages }: PagerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildUrl(page: number) {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("page", page.toString());

    return pathname + "?" + params.toString();
  }

  return (
    <div className="flex space-x-2">
      <ButtonLink
        href={currentPage > 1 ? buildUrl(currentPage - 1) : undefined}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </ButtonLink>
      <ButtonLink
        href={currentPage < totalPages ? buildUrl(currentPage + 1) : undefined}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </ButtonLink>
    </div>
  );
}
