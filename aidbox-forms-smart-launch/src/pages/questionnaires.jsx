import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Copy, Edit, Eye, Loader2, MoreHorizontal, Plus } from "lucide-react";
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
import { constructName, createQuestionnaireResponse } from "@/lib/utils.js";
import { useToast } from "@/hooks/use-toast.js";
import { Spinner } from "@/components/spinner.jsx";

export const Questionnaires = () => {
  const [searchParams] = useSearchParams();
  const { user, patient, encounter } = useLaunchContext();
  const client = useClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const currentPage = Number(searchParams.get("page")) || 1;
  const pageSize = 15;

  const { data } = useQuery({
    queryKey: ["questionnaires", currentPage],
    queryFn: () =>
      publicBuilderClient.request(
        `Questionnaire?_count=${pageSize}&page=${currentPage}`,
      ),
  });

  const mutation = useMutation({
    mutationFn: createQuestionnaireResponse,
    onSuccess: (qr) => {
      toast({
        title: "Response created",
        description: `New response created for ${constructName(patient.name)}`,
      });

      navigate(`/questionnaire-responses/${qr.id}`);
    },
  });

  const totalPages = Math.ceil(data.total / pageSize);

  const questionnaires = data.entry.map((x) => ({
    publisher: "Health Samurai",
    ...x.resource,
  }));

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
          mutation.isPending &&
          mutation.variables.questionnaire.id === questionnaire.id;

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
              <DropdownMenuItem
                onClick={() => {
                  mutation.mutate({
                    client,
                    questionnaire: questionnaire,
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
