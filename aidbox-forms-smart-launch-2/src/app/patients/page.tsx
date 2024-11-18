import { getPatients } from "@/lib/aidbox";
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
import { Edit, Search } from "lucide-react";
import { getCookie } from "cookies-next";
import { cookies } from "next/headers";
import { GENDER_OPTIONS, PAGE_SIZES, ValidPageSize } from "@/lib/constants";
import { Pager } from "@/components/pager";
import { getCurrentAidbox } from "@/lib/smart";

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

export default async function PatientsPage({ searchParams }: PageProps) {
  const aidbox = await getCurrentAidbox();
  const params = await searchParams;
  let pageSize = await extractPageSize(params);

  const currentPage = Number(params.page) || 1;
  const searchQuery = params.search;
  const genderFilter = params.gender;

  const patients = await getPatients(aidbox, {
    _count: pageSize,
    _page: currentPage,
    name: searchQuery,
    gender: genderFilter,
  });

  const totalPages = Math.ceil((patients.total || 0) / pageSize);

  return (
    <>
      <PageHeader
        items={[{ href: "/", label: "Home" }, { label: "Patients" }]}
      />
      <div className="flex-1 p-6">
        <div className="flex gap-2 mb-6">
          <form className="flex-1 flex gap-2" action="/patients">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="search"
                placeholder="Search patients by name..."
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
                <Link href="/patients">Clear</Link>
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
                <TableHead>Birth Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.entry?.map(({ resource: patient }) => (
                <TableRow key={patient?.id}>
                  <TableCell>{patient?.id}</TableCell>
                  <TableCell>
                    {patient?.name?.[0]?.text ||
                      `${patient?.name?.[0]?.given?.join(" ") || ""} ${
                        patient?.name?.[0]?.family || ""
                      }`.trim() ||
                      "N/A"}
                  </TableCell>
                  <TableCell className="capitalize">
                    {patient?.gender || "N/A"}
                  </TableCell>
                  <TableCell>{patient?.birthDate || "N/A"}</TableCell>
                  <TableCell>
                    {patient?.active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button asChild variant="link" size="sm">
                        <a href={`/patients/${patient?.id}/edit`}>
                          <Edit />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!patients.entry?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No patients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex items-center gap-4">
            {patients.total ? (
              <div className="text-sm text-muted-foreground">{`Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                patients.total,
              )} of ${patients.total} patients`}</div>
            ) : null}
            <PageSizeSelect value={pageSize.toString()} />
          </div>
          <Pager currentPage={currentPage} totalPages={totalPages} />
        </div>
      </div>
    </>
  );
}
