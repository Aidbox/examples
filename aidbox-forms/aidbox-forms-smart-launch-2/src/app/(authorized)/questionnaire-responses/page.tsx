import { getCurrentAidbox } from "@/lib/server/smart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { PageSizeSelect } from "@/components/page-size-select";
import { Pager } from "@/components/pager";
import {
  Bundle,
  Patient,
  Practitioner,
  Questionnaire,
  QuestionnaireResponse,
} from "fhir/r4";
import {
  constructName,
  getFirst,
  isDefined,
  typeSafeObjectFromEntries,
} from "@/lib/utils";
import { decidePageSize } from "@/lib/server/utils";
import { revalidatePath } from "next/cache";
import { QuestionnaireResponsesActions } from "@/components/questionnaire-responses-actions";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
}

export default async function QuestionnaireResponsesPage({
  searchParams,
}: PageProps) {
  const aidbox = await getCurrentAidbox();
  const params = await searchParams;

  const pageSize = await decidePageSize(params.pageSize);
  const page = Number(params.page) || 1;

  const response = await aidbox
    .get(
      "fhir/QuestionnaireResponse?_include=QuestionnaireResponse.questionnaire",
      {
        searchParams: {
          _count: pageSize,
          _page: page,
        },
      },
    )
    .json<Bundle<QuestionnaireResponse>>();

  const resources =
    response.entry?.map((entry) => entry.resource)?.filter(isDefined) || [];

  const questionnaires = typeSafeObjectFromEntries(
    await Promise.all(
      resources
        .map((resource) => resource.questionnaire)
        .filter(isDefined)
        .map(async (canonical) => {
          const [url, version] = canonical.split("|");

          return [
            canonical,
            await aidbox
              .get(
                `fhir/Questionnaire?url=${url}${version ? `&version=${version}` : ""}`,
              )
              .json<Questionnaire | Bundle<Questionnaire>>()
              .then(getFirst)
              .catch(() => undefined),
          ];
        }),
    ),
  );

  const patients = typeSafeObjectFromEntries(
    await Promise.all(
      resources
        .map((resource) => resource.subject?.reference)
        .filter(isDefined)
        .map(async (reference) => {
          return [
            reference,
            await aidbox
              .get(`fhir/${reference}`)
              .json<Patient>()
              .catch(() => undefined),
          ];
        }),
    ),
  );

  const authors = typeSafeObjectFromEntries(
    await Promise.all(
      resources
        .map((resource) => resource.author?.reference)
        .filter(isDefined)
        .map(async (reference) => [
          reference,
          await aidbox
            .get(`fhir/${reference}`)
            .json<Practitioner>()
            .catch(() => null),
        ]),
    ),
  );

  const total = response.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  async function deleteQuestionnaireResponse({ id }: QuestionnaireResponse) {
    "use server";

    const aidbox = await getCurrentAidbox();
    await aidbox.delete(`fhir/QuestionnaireResponse/${id}`).json();
    revalidatePath("/questionnaire-responses");
  }

  return (
    <>
      <PageHeader
        items={[{ href: "/", label: "Home" }, { label: "Questionnaires" }]}
      />
      <div className="flex-1 p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Questionnaire</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last modified</TableHead>
                <TableHead className="w-[1%] pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => {
                const subject = resource.subject?.reference
                  ? patients[resource.subject.reference]
                  : undefined;

                const questionnaire = resource.questionnaire
                  ? questionnaires[resource.questionnaire]
                  : undefined;

                const author = resource.author?.reference
                  ? authors[resource.author.reference]
                  : undefined;

                return (
                  <TableRow key={resource.id}>
                    <TableCell className="pl-6">
                      {constructName(subject?.name)}
                    </TableCell>
                    <TableCell>{questionnaire?.title}</TableCell>
                    <TableCell>{constructName(author?.name)}</TableCell>
                    <TableCell>{resource.status}</TableCell>
                    <TableCell>
                      {resource.meta?.lastUpdated &&
                        new Date(resource.meta.lastUpdated).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <QuestionnaireResponsesActions
                        questionnaire={questionnaire}
                        questionnaireResponse={resource}
                        onDeleteAction={deleteQuestionnaireResponse}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!resources.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No questionnaire responses found
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
