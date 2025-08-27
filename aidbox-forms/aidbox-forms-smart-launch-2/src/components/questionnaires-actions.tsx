"use client";

import { Questionnaire, QuestionnaireResponse } from "fhir/r4";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Edit,
  Eye,
  Import,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormsRenderer } from "@/components/forms-renderer";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/spinner";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export function QuestionnairesActions({
  questionnaire,
  library,
  onCheckQuestionnaireUsageAction,
  onDeleteAction,
  onImportAction,
  onCreateResponseAction,
}: {
  questionnaire: Questionnaire;
  library?: boolean;
  onCheckQuestionnaireUsageAction?: (questionnaire: Questionnaire) => Promise<boolean>;
  onDeleteAction?: (questionnaire: Questionnaire) => Promise<void>;
  onImportAction?: (questionnaire: Questionnaire) => Promise<Questionnaire>;
  onCreateResponseAction?: (
    questionnaire: Questionnaire,
  ) => Promise<QuestionnaireResponse>;
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState(false);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();
  const notSavedToast = useRef<ReturnType<typeof toast> | undefined>();

  function withRunning<T>(promise: Promise<T>): Promise<T> {
    setRunning(true);
    promise.finally(() => setRunning(false));
    return promise;
  }

  return (
    <>
      <DropdownMenu>
        {running ? (
          <Spinner className="h-8 w-8 inline-block" />
        ) : (
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              navigator &&
              navigator.clipboard.writeText(questionnaire.id as string)
            }
          >
            <Copy />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setViewing(true)}>
            <Eye />
            Preview
          </DropdownMenuItem>

          {!library && (
            <DropdownMenuItem asChild>
              <Link href={`/questionnaires/${questionnaire.id}`}>
                <Edit />
                Edit
              </Link>
            </DropdownMenuItem>
          )}

          {!library && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                if (onDeleteAction) {
                  const used = onCheckQuestionnaireUsageAction ? await onCheckQuestionnaireUsageAction(questionnaire) : false;

                  if (confirm(`Are you sure you want to delete this questionnaire? ${used ? `\n\nWarning: This questionnaire is used in responses. Deleting it will make them invalid.` : ""}`)) {
                    await withRunning(onDeleteAction(questionnaire));

                    toast({
                      title: "Questionnaire deleted",
                      description: `Questionnaire deleted successfully`,
                    });
                  }
                }
              }}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          )}

          {!library && (
            <DropdownMenuItem
              onClick={async () => {
                if (onCreateResponseAction) {
                  try {
                    const { id } = await withRunning(
                      onCreateResponseAction(questionnaire),
                    );

                    toast({
                      title: "New questionnaire response created and populated",
                      description: `You are being redirected to the form filling page...`,
                    });

                    router.push(`/questionnaire-responses/${id}`);
                  } catch {
                    toast({
                      title: "Questionnaire response creation failed",
                      description: `Failed to create new questionnaire response`,
                      variant: "destructive",
                    });
                  }
                }
              }}
            >
              <Plus />
              Create response
            </DropdownMenuItem>
          )}

          {library && (
            <DropdownMenuItem
              onClick={async () => {
                if (onImportAction) {
                  const { id } = await withRunning(
                    onImportAction(questionnaire),
                  );
                  toast({
                    title: "Questionnaire imported",
                    description: `Questionnaire imported successfully`,
                    action: (
                      <ToastAction
                        altText="Edit"
                        onClick={() => {
                          router.push(`/questionnaires/${id}`);
                        }}
                      >
                        Edit
                      </ToastAction>
                    ),
                  });
                }
              }}
            >
              <Import />
              Import
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={viewing}
        onOpenChange={(open) => {
          setViewing(open);
          if (!open && notSavedToast.current) {
            notSavedToast.current.dismiss();
            notSavedToast.current = undefined;
          }
        }}
      >
        <DialogContent className="flex flex-col max-w-[calc(100vw_-_4rem)] h-[calc(100vh_-_4rem)]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {viewing && (
            <Suspense fallback={<Spinner expand="true" />}>
              <FormsRenderer
                hideFooter
                questionnaire={questionnaire}
                onChange={() => {
                  if (!notSavedToast.current) {
                    notSavedToast.current = toast({
                      title: "Not saved",
                      description: "This is a preview, changes are not saved",
                    });
                  }
                }}
              />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
