"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setCookie } from "cookies-next";
import { PAGE_SIZES } from "@/lib/constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PAGE_SIZE_OPTIONS = PAGE_SIZES.OPTIONS.map((size) => ({
  value: size.toString(),
  label: `${size} per page`,
}));

interface PageSizeSelectProps {
  value?: string;
}

export function PageSizeSelect({
  value = PAGE_SIZES.DEFAULT.toString(),
}: PageSizeSelectProps) {
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
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[130px]">
        <SelectValue placeholder={`${PAGE_SIZES.DEFAULT} per page`} />
      </SelectTrigger>
      <SelectContent>
        {PAGE_SIZE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
