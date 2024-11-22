"use client";

import { Questionnaire } from "fhir/r4";
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
import { Suspense, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormsRenderer } from "@/components/forms-renderer";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/spinner";

export function QuestionnairesActions({
  questionnaire,
  library,
}: {
  questionnaire: Questionnaire;
  library?: boolean;
}) {
  const [viewing, setViewing] = useState(false);
  const { toast } = useToast();

  return (
    <>
      <DropdownMenu>
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
              onClick={() => {}}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          )}

          {!library && (
            <DropdownMenuItem onClick={() => {}}>
              <Plus />
              Create response
            </DropdownMenuItem>
          )}

          {library && (
            <DropdownMenuItem onClick={() => {}}>
              <Import />
              Import
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog onOpenChange={setViewing} open={viewing}>
        <DialogContent className="flex flex-col max-w-[calc(100vw_-_4rem)] h-[calc(100vh_-_4rem)]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {viewing && (
            <Suspense fallback={<Spinner expand={true} />}>
              <FormsRenderer
                questionnaire={questionnaire}
                onChange={() => {
                  toast({
                    title: "Not saved",
                    description: "This is a preview, changes will not be saved",
                  });
                }}
              />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
