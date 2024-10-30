import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { publicBuilderClient, useClient } from "@/hooks/use-client.jsx";
import { DataTable } from "@/components/data-table.jsx";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import {
  ChevronDown,
  Copy,
  Edit,
  Eye,
  Import,
  MoreHorizontal,
  Plus,
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
  deleteQuestionnaire,
  saveQuestionnaire,
} from "@/lib/utils.js";
import { useToast } from "@/hooks/use-toast.js";
import { Spinner } from "@/components/spinner.jsx";
import { ToastAction } from "@/ui/toast.jsx";

export const Questionnaires = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  console.log(searchParams.toString());
  const { user, patient, encounter } = useLaunchContext();
  const client = useClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const currentPage = Number(searchParams.get("page")) || 1;
  const pageSize = 15;

  const source = searchParams.get("source") || "library";

  const setSource = (value) => {
    searchParams.set("source", value);
    setSearchParams(searchParams);
  };

  const currentQueryKey = ["questionnaires", source, currentPage];
  const firstPageOfEhrQueryKey = ["questionnaires", "ehr", 1];

  const { data } = useQuery({
    queryKey: currentQueryKey,
    queryFn: () =>
      source === "library"
        ? publicBuilderClient.request(
            `Questionnaire?_count=${pageSize}&page=${currentPage}`,
          )
        : client.request(
            `Questionnaire?_count=${pageSize}&_getpagesoffset=${pageSize * (currentPage - 1)}`,
          ),
  });

  const createQuestionnaireMutation = useMutation({
    mutationFn: createQuestionnaireResponse,
    onSuccess: (qr) => {
      toast({
        title: "Response created",
        description: `New response created for ${constructName(patient.name)}`,
      });

      navigate(`/questionnaire-responses/${qr.id}`);
    },
  });

  const importQuestionnaireMutation = useMutation({
    mutationFn: (questionnaire) => saveQuestionnaire(client, questionnaire),
    onMutate: async (questionnaire) => {
      await queryClient.cancelQueries({
        queryKey: firstPageOfEhrQueryKey,
      });

      const previousData = queryClient.getQueryData(firstPageOfEhrQueryKey);

      queryClient.setQueryData(firstPageOfEhrQueryKey, (data) => ({
        ...data,
        entry: [
          {
            resource: questionnaire,
          },
          ...(data?.entry || []),
        ],
      }));

      navigate("?source=ehr&page=1");

      return { previousData };
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.cancelQueries({
        queryKey: firstPageOfEhrQueryKey,
      });

      queryClient.setQueryData(firstPageOfEhrQueryKey, {
        ...context.previousData,
        entry: [
          {
            resource: data,
          },
          ...(context.previousData?.entry || []),
        ],
      });

      toast({
        title: "Questionnaire imported",
        description: `Questionnaire imported successfully`,
        action: (
          <ToastAction
            altText="Edit"
            onClick={() => {
              navigate(`/questionnaires/${data.id}`);
            }}
          >
            Edit
          </ToastAction>
        ),
      });
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(firstPageOfEhrQueryKey, context.previousData);

      toast({
        variant: "destructive",
        title: "Import questionnaire",
        description: `Unable to import questionnaire: ${err.message}`,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: firstPageOfEhrQueryKey,
      });
    },
  });

  const deleteQuestionnaireMutation = useMutation({
    mutationFn: (questionnaire) => deleteQuestionnaire(client, questionnaire),
    onMutate: async (questionnaire) => {
      await queryClient.cancelQueries({ queryKey: currentQueryKey });
      const previousData = queryClient.getQueryData(currentQueryKey);

      queryClient.setQueryData(currentQueryKey, (data) => ({
        ...data,
        entry: data.entry?.filter((x) => x.resource.id !== questionnaire.id),
      }));

      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: "Questionnaire deleted",
        description: `Questionnaire deleted successfully`,
      });
    },

    onError: (err, newTodo, context) => {
      queryClient.setQueryData(currentQueryKey, context.previousData);

      toast({
        variant: "destructive",
        title: "Delete questionnaire",
        description: `Unable to delete questionnaire: ${err.message}`,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: currentQueryKey });
    },
  });

  const totalPages = Math.ceil(data.total / pageSize);

  const questionnaires =
    data.entry?.map((x) => ({
      publisher: source === "library" ? "Health Samurai" : undefined,
      ...x.resource,
    })) || [];

  const [previewingQuestionnaire, setPreviewingQuestionnaire] = useState(null);

  const columns = [
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      accessorKey: "version",
      header: "Version",
    },
    {
      accessorKey: "publisher",
      header: "Publisher",
    },
    {
      id: "actions",
      cell: ({ row: { original: questionnaire } }) => {
        const loading =
          (createQuestionnaireMutation.isPending &&
            createQuestionnaireMutation.variables.questionnaire.id ===
              questionnaire.id) ||
          questionnaire.id === undefined; // optimistically importing questionnaire

        return loading ? (
          <Spinner className="h-4 my-2" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={loading}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(questionnaire.id)}
              >
                <Copy />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPreviewingQuestionnaire(questionnaire.id)}
              >
                <Eye />
                View questionnaire
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/questionnaires/${questionnaire.id}`}>
                  <Edit />
                  Edit questionnaire
                </Link>
              </DropdownMenuItem>
              {source === "library" && (
                <DropdownMenuItem
                  onClick={() => {
                    importQuestionnaireMutation.mutate({
                      ...questionnaire,
                      id: undefined,
                    });
                  }}
                >
                  <Import />
                  Import questionnaire
                </DropdownMenuItem>
              )}
              {source !== "library" && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    deleteQuestionnaireMutation.mutate(questionnaire);
                  }}
                >
                  <Trash2 />
                  Delete questionnaire
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  createQuestionnaireMutation.mutate({
                    client,
                    questionnaire: {
                      ...questionnaire,
                      // used to link questionnaire response
                      url:
                        source === "library"
                          ? `${publicBuilderClient.state.serverUrl}/Questionnaire/${questionnaire.id}`
                          : undefined,
                    },
                    subject: patient,
                    encounter,
                    author: user,
                  });
                }}
              >
                <Plus />
                Create response
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="p-6 overflow-auto flex-1">
      <div className="mb-4 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Source: {source === "library" ? "Forms Public Library" : "EHR"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={source} onValueChange={setSource}>
              <DropdownMenuRadioItem value="library">
                Forms Library
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ehr">EHR</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <DataTable columns={columns} data={questionnaires} />

      <Pagination currentPage={currentPage} totalPages={totalPages} />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPreviewingQuestionnaire(null);
          }
        }}
        open={!!previewingQuestionnaire}
      >
        <DialogContent className="flex flex-col max-w-[calc(100vw_-_4rem)] h-[calc(100vh_-_4rem)]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {previewingQuestionnaire && (
            <Suspense fallback={<Loading />}>
              <QuestionnairePreview id={previewingQuestionnaire} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
