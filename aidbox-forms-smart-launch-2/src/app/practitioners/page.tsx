import { getPractitioners } from "@/lib/aidbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { PageSizeSelect } from "@/components/page-size-select";
import Link from "next/link";
import { Search } from "lucide-react";
import { getCookie } from "cookies-next";
import { cookies } from "next/headers";
import { GENDER_OPTIONS, PAGE_SIZES, ValidPageSize } from "@/lib/constants";
import { Pager } from "@/components/pager";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    gender?: "male" | "female" | "other" | "unknown";
    pageSize?: string;
  }>;
}

async function extractPageSize(params: Awaited<PageProps["searchParams"]>) {
  let pageSize: ValidPageSize = PAGE_SIZES.DEFAULT;

  const pageSizeFromCookie = await getCookie("pageSize", { cookies });
  if (pageSizeFromCookie) {
    const parsedPageSize = Number(pageSizeFromCookie);
    if (PAGE_SIZES.OPTIONS.includes(parsedPageSize as ValidPageSize)) {
      pageSize = parsedPageSize as ValidPageSize;
    }
  }

  const pageSizeFromSearch = params.pageSize;
  if (pageSizeFromSearch) {
    const parsedPageSize = Number(pageSizeFromSearch);
    if (PAGE_SIZES.OPTIONS.includes(parsedPageSize as ValidPageSize)) {
      pageSize = parsedPageSize as ValidPageSize;
    }
  }
  return pageSize;
}

export default async function PractitionersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let pageSize = await extractPageSize(params);

  const currentPage = Number(params.page) || 1;
  const searchQuery = params.search;
  const genderFilter = params.gender;

  const practitioners = await getPractitioners({
    _count: pageSize,
    _page: currentPage,
    name: searchQuery,
    gender: genderFilter,
  });

  const totalPages = Math.ceil((practitioners.total || 0) / pageSize);

  return (
    <>
      <PageHeader
        items={[{ href: "/", label: "Home" }, { label: "Practitioners" }]}
      />
      <div className="flex-1 p-6">
        <div className="flex gap-2 mb-6">
          <form className="flex-1 flex gap-2" action="/practitioners">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="search"
                placeholder="Search practitioners by name..."
                defaultValue={searchQuery}
                className="pl-8"
              />
            </div>
            <Select name="gender" defaultValue={genderFilter || undefined}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All genders" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Search</Button>
            {(searchQuery || genderFilter) && (
              <Button variant="ghost" asChild>
                <Link href="/practitioners">Clear</Link>
              </Button>
            )}
          </form>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {practitioners.entry.map(({ resource: practitioner }) => (
                <TableRow key={practitioner.id}>
                  <TableCell className="font-medium">
                    {practitioner.id}
                  </TableCell>
                  <TableCell>
                    {[
                      practitioner.name?.[0]?.prefix?.join(" "),
                      practitioner.name?.[0]?.given?.join(" "),
                      practitioner.name?.[0]?.family,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </TableCell>
                  <TableCell>
                    {GENDER_OPTIONS.find(
                      (option) => option.value === practitioner.gender,
                    )?.label || "Not specified"}
                  </TableCell>
                  <TableCell>
                    {practitioner.telecom?.find(
                      (t) => t.system === "email" && t.use === "work",
                    )?.value || "Not specified"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex items-center gap-4">
            {practitioners.total ? (
              <div className="text-sm text-muted-foreground">{`Showing ${
                (currentPage - 1) * pageSize + 1
              }-${Math.min(
                currentPage * pageSize,
                practitioners.total,
              )} of ${practitioners.total} practitioners`}</div>
            ) : null}
            <PageSizeSelect value={pageSize.toString()} />
          </div>
          <Pager currentPage={currentPage} totalPages={totalPages} />
        </div>
      </div>
    </>
  );
}
