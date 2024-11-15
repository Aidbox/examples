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
import * as React from "react";
import { Suspense, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/ui/input.jsx";
import { IndefiniteProgress } from "@/components/indefinite-progress.jsx";
import { useThrottle } from "ahooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLaunchContext } from "@/hooks/use-launch-context.jsx";
import { publicBuilderClient, useClient } from "@/hooks/use-client.jsx";
import { useToast } from "@/hooks/use-toast.js";
import {
  constructName,
  createQuestionnaireResponse,
  deleteQuestionnaire,
  saveQuestionnaire,
} from "@/lib/utils.js";
import { ToastAction } from "@/ui/toast.jsx";
import { Spinner } from "@/components/spinner.jsx";
import { DataTable } from "@/components/data-table.jsx";
import { Pagination } from "@/components/pagination.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog.jsx";
import { Loading } from "@/components/loading.jsx";
import { QuestionnairePreview } from "@/components/questionnaire-preview.jsx";

export const Questionnaires = () => {
  const [params, _setParams] = useSearchParams();

  const setParams = (newParams) => {
    for (const [name, value] of Object.entries(newParams)) {
      if (value === undefined || value === "") {
        params.delete(name);
      } else {
        params.set(name, value);
      }
    }
    _setParams(params, {
      replace: true,
    });
  };

  const search = params.get("search") || "";
  const debouncedSearch = useThrottle(search, { wait: 500 });
  const page = Number(params.get("page")) || 1;
  const source = params.get("source") || "library";

  const queryClient = useQueryClient();
  const { user, patient, encounter } = useLaunchContext();
  const client = useClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const pageSize = 15;
  const queryKey = ["questionnaires", source, page, debouncedSearch];

  const questionnaireResults = useQuery({
    queryKey,
    queryFn: () =>
      source === "library"
        ? publicBuilderClient.request(
            `Questionnaire?_count=${pageSize}&page=${page}${debouncedSearch ? `&title:contains=${decodeURIComponent(debouncedSearch)}` : ""}`,
          )
        : client.request(
            `Questionnaire?_count=${pageSize}&_getpagesoffset=${pageSize * (page - 1)}${debouncedSearch ? `&title:contains=${decodeURIComponent(debouncedSearch)}` : ""}`,
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
    mutationFn: (questionnaire) =>
      saveQuestionnaire(client, { ...questionnaire, id: undefined }),
    onSuccess: async (data) => {
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
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Import questionnaire",
        description: `Unable to import questionnaire: ${err.message}`,
      });
    },
  });

  const deleteQuestionnaireMutation = useMutation({
    mutationFn: (questionnaire) => deleteQuestionnaire(client, questionnaire),
    onSuccess: async (_, questionnaire) => {
      await queryClient.cancelQueries({ queryKey });

      queryClient.setQueryData(queryKey, (data) => ({
        ...data,
        entry: data.entry?.filter((x) => x.resource.id !== questionnaire.id),
      }));

      toast({
        title: "Questionnaire deleted",
        description: `Questionnaire deleted successfully`,
      });
    },

    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Delete questionnaire",
        description: `Unable to delete questionnaire: ${err.message}`,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const totalPages = Math.ceil(
    (questionnaireResults.data?.total || 0) / pageSize,
  );

  const questionnaires =
    questionnaireResults.data?.entry?.map((x) => ({
      publisher: source === "library" ? "Health Samurai" : undefined,
      ...x.resource,
    })) || [];

  const [previewingQuestionnaire, setPreviewingQuestionnaire] = useState(null);
  const [deletingQuestionnaire, setDeletingQuestionnaire] = useState(null);

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
          (importQuestionnaireMutation.isPending &&
            importQuestionnaireMutation.variables?.id === questionnaire.id) ||
          deleteQuestionnaireMutation.variables?.id === questionnaire.id ||
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
                Preview
              </DropdownMenuItem>
              {source !== "library" && (
                <DropdownMenuItem asChild>
                  <Link to={`/questionnaires/${questionnaire.id}`}>
                    <Edit />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {source === "library" && (
                <DropdownMenuItem
                  onClick={() => {
                    importQuestionnaireMutation.mutate(questionnaire);
                  }}
                >
                  <Import />
                  Import
                </DropdownMenuItem>
              )}
              {source !== "library" && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeletingQuestionnaire(questionnaire)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              )}
              {source !== "library" && (
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
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <IndefiniteProgress active={questionnaireResults.isFetching} />

      <div className="p-6 overflow-auto flex-1">
        <div className="mb-4 gap-4 flex justify-between">
          <Input
            placeholder="Search"
            className="max-w-[20rem]"
            value={search}
            onChange={(e) => {
              setParams({ search: e.target.value, page: undefined });
            }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Source: {source === "library" ? "Forms Library" : "EHR"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={source}
                onValueChange={(value) => {
                  setParams({ source: value });
                }}
              >
                <DropdownMenuRadioItem value="library">
                  Forms Library
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="ehr">EHR</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <DataTable columns={columns} data={questionnaires} />

        <Pagination currentPage={page} totalPages={totalPages} />

        <AlertDialog
          onOpenChange={(open) => {
            if (!open) {
              setDeletingQuestionnaire(null);
            }
          }}
          open={!!deletingQuestionnaire}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Proceeding will permanently delete
                this questionnaire from the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteQuestionnaireMutation.mutate(deletingQuestionnaire);
                  setDeletingQuestionnaire(null);
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
    </>
  );
};
