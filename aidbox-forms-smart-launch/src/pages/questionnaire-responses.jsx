import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { publicBuilderClient, useClient } from "@/hooks/use-client.jsx";
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
import {
  Copy,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog.jsx";
import * as React from "react";
import { Suspense, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { QuestionnairePreview } from "@/components/questionnaire-preview.jsx";
import { Loading } from "@/components/loading.jsx";
import { Pagination } from "@/components/pagination.jsx";
import { useLaunchContext } from "@/hooks/use-launch-context.jsx";
import {
  constructName,
  createQuestionnaireResponse,
  findQuestionnaire,
} from "@/lib/utils.js";
import { useToast } from "@/hooks/use-toast.js";
import { Spinner } from "@/components/spinner.jsx";

export const QuestionnaireResponses = () => {
  const [searchParams] = useSearchParams();
  const { patient } = useLaunchContext();
  const client = useClient();
  const navigate = useNavigate();

  const currentPage = Number(searchParams.get("page")) || 1;
  const pageSize = 15;

  const { data } = useQuery({
    queryKey: ["questionnaire-responses", currentPage],
    queryFn: () =>
      client.request(
        `QuestionnaireResponse?_subject=${patient.id}&_count=${pageSize}&_page=${currentPage}`,
      ),
  });

  const totalPages = Math.ceil(data.total / pageSize);

  const questionnaireResponse = data.entry.map((x) => x.resource);

  const dummy = Symbol("dummy");

  const practitioners = useQueries({
    queries: questionnaireResponse
      .filter(({ author }) => author?.id)
      .map(({ author }) => ({
        queryKey: ["author", author.id],
        queryFn: () =>
          client.request(`Practitioner/${author.id}`).catch(() => dummy),
      })),
    combine: (results) =>
      results.reduce((acc, { data }) => {
        if (data !== dummy) {
          acc[data.id] = data;
        }
        return acc;
      }, {}),
  });

  const questionnaires = useQueries({
    queries: questionnaireResponse
      .filter(({ questionnaire }) => questionnaire)
      .map(({ questionnaire }) => ({
        queryKey: ["questionnaire", questionnaire],
        queryFn: () =>
          findQuestionnaire(client, questionnaire).then(
            (result) => ({ key: questionnaire, result }),
            () => dummy,
          ),
      })),
    combine: (results) =>
      results.reduce((acc, { data }) => {
        if (data !== dummy) {
          acc[data.key] = data.result;
        }
        return acc;
      }, {}),
  });

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

  return (
    <div className="p-6 overflow-auto flex-1">
      <DataTable columns={columns} data={questionnaireResponse} />

      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
};
