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
import { PageHeader } from "@/components/page-header";
import { PageSizeSelect } from "@/components/page-size-select";
import Link from "next/link";
import { Search } from "lucide-react";
import { Pager } from "@/components/pager";
import { Bundle, Questionnaire } from "fhir/r4";
import { isDefined } from "@/lib/utils";
import { decidePageSize } from "@/lib/server/utils";
import ky from "ky";
import { QuestionnairesActions } from "@/components/questionnaires-actions";
import { getCurrentAidbox } from "@/lib/server/smart";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    title?: string;
    pageSize?: string;
  }>;
}

export default async function PublicLibraryPage({ searchParams }: PageProps) {
  const publicLibrary = ky.extend({
    prefixUrl: "https://form-builder.aidbox.app",
  });
  const params = await searchParams;

  const pageSize = await decidePageSize(params.pageSize);
  const page = Number(params.page) || 1;
  const title = params.title || "";

  const response = await publicLibrary
    .get("fhir/Questionnaire", {
      searchParams: {
        _count: pageSize,
        _page: page,
        ...(title && { "title:contains": title }),
      },
    })
    .json<Bundle<Questionnaire>>();

  const resources =
    response.entry?.map((entry) => entry.resource)?.filter(isDefined) || [];

  const total = response.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  async function importQuestionnaire(questionnaire: Questionnaire) {
    "use server";

    const aidbox = await getCurrentAidbox();
    return aidbox
      .post("fhir/Questionnaire", {
        json: { ...questionnaire, id: undefined },
      })
      .json<Questionnaire>();
  }

  return (
    <>
      <PageHeader
        items={[{ href: "/", label: "Home" }, { label: "Questionnaires" }]}
      />
      <div className="flex-1 p-6">
        <div className="flex gap-2 mb-6">
          <form className="flex-1 flex gap-2" action="/questionnaires">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="title"
                placeholder="Search questionnaires by title..."
                defaultValue={title}
                className="pl-8"
              />
            </div>
            <Button type="submit">Search</Button>
            {title && (
              <Button variant="ghost" asChild>
                <Link href="/questionnaires">Clear</Link>
              </Button>
            )}
          </form>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[1%] pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="pl-6">{resource.title}</TableCell>
                  <TableCell>{resource.status}</TableCell>
                  <TableCell>{resource.date}</TableCell>
                  <TableCell className="text-right pr-6">
                    <QuestionnairesActions
                      library
                      questionnaire={resource}
                      onImportAction={importQuestionnaire}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!resources.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No questionnaires found
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
              }-${Math.min(
                page * pageSize,
                total,
              )} of ${total} practitioners`}</div>
            ) : null}
            <PageSizeSelect currentSize={pageSize} />
          </div>
          <Pager currentPage={page} totalPages={totalPages} />
        </div>
      </div>
    </>
  );
}
