import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/constants";
import { getCookie } from "cookies-next";
import { cookies } from "next/headers";

export async function decidePageSize(pageSize: string | undefined) {
  if (pageSize) {
    const number = Number(pageSize);
    if (PAGE_SIZES.includes(number)) {
      return number;
    }
  }

  const saved = await getCookie("pageSize", { cookies });
  if (saved) {
    const number = Number(saved);
    if (PAGE_SIZES.includes(number)) {
      return number;
    }
  }

  return DEFAULT_PAGE_SIZE;
}
