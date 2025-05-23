import {
  getCurrentAidbox,
  getCurrentPatient,
  getCurrentUser,
} from "@/lib/server/smart";
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
import {
  Bundle,
  Parameters,
  Questionnaire,
  QuestionnaireResponse,
} from "fhir/r4";
import { isDefined } from "@/lib/utils";
import { decidePageSize } from "@/lib/server/utils";
import { QuestionnairesActions } from "@/components/questionnaires-actions";
import { revalidatePath } from "next/cache";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    title?: string;
    pageSize?: string;
  }>;
}

export default async function QuestionnairesPage({ searchParams }: PageProps) {
  const aidbox = await getCurrentAidbox();
  const params = await searchParams;

  const pageSize = await decidePageSize(params.pageSize);
  const page = Number(params.page) || 1;
  const title = params.title || "";

  const response = await aidbox
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

  async function checkQuestionnaireUsage(questionnaire: Questionnaire) {
    "use server";

    let total = 0;
    const aidbox = await getCurrentAidbox();

    if (questionnaire.url) {
      const response = await aidbox
        .get("fhir/QuestionnaireResponse", {
          searchParams: {
            _summary: 'count',
            questionnaire: questionnaire.url,
          },
        })
        .json<Bundle<QuestionnaireResponse>>();

      total += response.total || 0;

      if (questionnaire.version && total === 0) {
        const response = await aidbox
          .get("fhir/QuestionnaireResponse", {
            searchParams: {
              _summary: 'count',
              questionnaire: `${questionnaire.url}|${questionnaire.version}`,
            },
          })
          .json<Bundle<QuestionnaireResponse>>();

        total += response.total || 0;
      }
    }

    return total !== 0;
  }

  async function deleteQuestionnaire(questionnaire: Questionnaire) {
    "use server";

    const aidbox = await getCurrentAidbox();
    await aidbox.delete(`fhir/Questionnaire/${questionnaire.id}`).json();
    revalidatePath("/questionnaires");
  }

  async function createQuestionnaireResponse(questionnaire: Questionnaire) {
    "use server";

    const aidbox = await getCurrentAidbox();
    const subject = await getCurrentPatient().catch(() => null);
    // const encounter = await getCurrentEncounter().catch(() => null);
    // TODO: fix data sync with EHR
    // Encounters are created due to errors in references
    const author = await getCurrentUser().catch(() => null);

    const result = await aidbox
      .post(`fhir/Questionnaire/$populate`, {
        json: {
          resourceType: "Parameters",
          parameter: [
            {
              name: "questionnaire",
              resource: questionnaire,
            },
            {
              name: "subject",
              resource: subject,
            },
            {
              name: "context",
              part: [
                ...(author
                  ? [
                      {
                        name: "name",
                        valueString: "author",
                      },
                      {
                        name: "content",
                        resource: author,
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
      })
      .json<Parameters>();

    const populated = result.parameter?.find(({ name }) => name === "response")
      ?.resource as QuestionnaireResponse;

    populated.questionnaire = `${questionnaire.url}${
      questionnaire.version ? `|${questionnaire.version}` : ""
    }`;

    const saved = await aidbox
      .post("fhir/QuestionnaireResponse", {
        json: populated,
      })
      .json<QuestionnaireResponse>();

    revalidatePath("/questionnaire-responses");

    return saved;
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
                <TableHead>Version</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[1%] pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="pl-6">{resource.title}</TableCell>
                  <TableCell>{resource.status}</TableCell>
                  <TableCell>{resource.version}</TableCell>
                  <TableCell>
                    {resource.meta?.lastUpdated &&
                      new Date(resource.meta.lastUpdated).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <QuestionnairesActions
                      questionnaire={resource}
                      onCheckQuestionnaireUsageAction={checkQuestionnaireUsage}
                      onDeleteAction={deleteQuestionnaire}
                      onCreateResponseAction={createQuestionnaireResponse}
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
