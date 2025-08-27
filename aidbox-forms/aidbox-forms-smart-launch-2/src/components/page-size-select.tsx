"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setCookie } from "cookies-next";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PageSizeSelect({
  currentSize = DEFAULT_PAGE_SIZE,
}: {
  currentSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleValueChange = (size: string) => {
    setCookie("pageSize", size, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    const params = new URLSearchParams(searchParams?.toString());
    params.set("pageSize", size);

    router.push(pathname + "?" + params.toString());
  };

  return (
    <Select value={currentSize?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[130px]">
        <SelectValue placeholder={`${DEFAULT_PAGE_SIZE} per page`} />
      </SelectTrigger>
      <SelectContent>
        {PAGE_SIZES.map((size) => (
          <SelectItem key={size} value={size.toString()}>
            {size} per page
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
