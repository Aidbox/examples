import { getCurrentAidbox } from "@/lib/server/smart";
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
import { GENDER_OPTIONS } from "@/lib/constants";
import { Pager } from "@/components/pager";
import { Bundle, Practitioner } from "fhir/r4";
import { constructGender, constructName, isDefined } from "@/lib/utils";
import { decidePageSize } from "@/lib/server/utils";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    name?: string;
    gender?: "male" | "female" | "other" | "unknown";
    pageSize?: string;
  }>;
}

export default async function PatientsPage({ searchParams }: PageProps) {
  const aidbox = await getCurrentAidbox();
  const params = await searchParams;

  const pageSize = await decidePageSize(params.pageSize);
  const page = Number(params.page) || 1;
  const name = params.name || "";
  const gender = params.gender || "";

  const response = await aidbox
    .get("fhir/Patient", {
      searchParams: {
        _count: pageSize,
        _page: page,
        ...(name && { name }),
        ...(gender && { gender }),
      },
    })
    .json<Bundle<Practitioner>>();

  const resources =
    response.entry?.map((entry) => entry.resource)?.filter(isDefined) || [];

  const total = response.total || 0;
  const totalPages = Math.ceil(total / pageSize);

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
                name="name"
                placeholder="Search patients by name..."
                defaultValue={name}
                className="pl-8"
              />
            </div>
            <Select name="gender" defaultValue={gender || undefined}>
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
            {(name || gender) && (
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
                <TableHead className="pl-6">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Birth Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="pl-6">{resource.id}</TableCell>
                  <TableCell>{constructName(resource.name)}</TableCell>
                  <TableCell>
                    {constructGender(resource.gender) || "Not specified"}
                  </TableCell>
                  <TableCell>{resource.birthDate || "N/A"}</TableCell>
                  <TableCell>
                    {resource.active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-gray-500">Inactive</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!resources.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No patients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex items-center gap-4">
            {total ? (
              <div className="text-sm text-muted-foreground">{`Showing ${
                (page - 1) * pageSize + 1
              }-${Math.min(page * pageSize, total)} of ${total} patients`}</div>
            ) : null}
            <PageSizeSelect currentSize={pageSize} />
          </div>
          <Pager currentPage={page} totalPages={totalPages} />
        </div>
      </div>
    </>
  );
}
