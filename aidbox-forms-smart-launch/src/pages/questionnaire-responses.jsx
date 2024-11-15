import { useQueries, useQuery } from "@tanstack/react-query";
import { useClient } from "@/hooks/use-client.jsx";
import { DataTable } from "@/components/data-table.jsx";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Copy, Edit, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Pagination } from "@/components/pagination.jsx";
import { useLaunchContext } from "@/hooks/use-launch-context.jsx";
import { constructName, findQuestionnaire } from "@/lib/utils.js";
import { IndefiniteProgress } from "@/components/indefinite-progress.jsx";

export const QuestionnaireResponses = () => {
  const [searchParams] = useSearchParams();
  const { patient } = useLaunchContext();
  const client = useClient();
  const navigate = useNavigate();

  const currentPage = Number(searchParams.get("page")) || 1;
  const pageSize = 15;

  const questionnaireResponseResult = useQuery({
    queryKey: ["questionnaire-responses", currentPage],
    queryFn: () =>
      client.request(
        `QuestionnaireResponse?_subject=${patient.id}&_count=${pageSize}&_page=${currentPage}`,
      ),
  });

  const totalPages = Math.ceil(
    (questionnaireResponseResult.data?.total || 0) / pageSize,
  );

  const questionnaireResponses =
    questionnaireResponseResult.data?.entry?.map((x) => x.resource) || [];

  const practitionerResults = useQueries({
    queries: questionnaireResponses
      .filter(({ author }) => author?.id)
      .map(({ author }) => ({
        queryKey: ["author", author.id],
        queryFn: () => client.request(`Practitioner/${author.id}`),
      })),
  });

  const practitioners = practitionerResults.reduce((acc, { data }) => {
    if (data) {
      acc[data.id] = data;
    }
    return acc;
  }, {});

  const questionnaireResults = useQueries({
    queries: questionnaireResponses
      .filter(({ questionnaire }) => questionnaire)
      .map(({ questionnaire }) => ({
        queryKey: ["questionnaire", questionnaire],
        queryFn: () =>
          findQuestionnaire(client, questionnaire).then((result) => ({
            key: questionnaire,
            result,
          })),
      })),
  });

  const questionnaires = questionnaireResults.reduce((acc, { data }) => {
    if (data) {
      acc[data.key] = data.result;
    }
    return acc;
  }, {});

  const columns = [
    {
      header: "Author",
      accessorFn: (row) =>
        row.author?.id && practitioners[row.author.id]?.name
          ? constructName(practitioners[row.author.id]?.name)
          : "Unknown",
    },
    {
      header: "Questionnaire",
      accessorFn: (row) =>
        questionnaires[row.questionnaire]?.title
          ? questionnaires[row.questionnaire]?.title
          : row.questionnaire,
    },
    {
      header: "Last Updated",
      accessorFn: (row) => new Date(row.meta.lastUpdated).toLocaleString(),
    },
    {
      header: "Status",
      accessorKey: "status",
    },
    {
      id: "actions",
      cell: ({ row: { original: questionnaireResponse } }) => {
        return (
          <DropdownMenu modal>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(questionnaireResponse.id)
                }
              >
                <Copy />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  navigate(
                    `/questionnaire-responses/${questionnaireResponse.id}`,
                  )
                }
              >
                <Edit />
                Edit response
              </DropdownMenuItem>
              {/*<DropdownMenuItem className="text-destructive focus:text-destructive">*/}
              {/*  <Trash2 />*/}
              {/*  Delete response*/}
              {/*</DropdownMenuItem>*/}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const isFetching =
    questionnaireResponseResult.isFetching ||
    questionnaireResults.some((x) => x.isFetching) ||
    practitionerResults.some((x) => x.isFetching);

  return (
    <>
      <IndefiniteProgress active={isFetching} />

      <div className="p-6 overflow-auto flex-1">
        <DataTable columns={columns} data={questionnaireResponses} />

        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </>
  );
};
