"use client";

import { FormsBuilder } from "@/components/forms-builder";
import { Questionnaire } from "fhir/r4";
import { Suspense, useTransition } from "react";
import { Spinner } from "@/components/spinner";

interface QuestionnaireEditorProps {
  questionnaire: Questionnaire;
  onSaveAction: (questionnaire: Questionnaire) => Promise<void>;
}

export function QuestionnaireEditor({
  questionnaire,
  onSaveAction,
}: QuestionnaireEditorProps) {
  const [, startTransition] = useTransition();

  return (
    <Suspense fallback={<Spinner expand="true" />}>
      <FormsBuilder
        questionnaire={questionnaire}
        onChange={(updatedQuestionnaire) => {
          startTransition(async () => {
            try {
              await onSaveAction(updatedQuestionnaire);
            } catch (error) {
              console.error("Failed to save questionnaire:", error);
            }
          });
        }}
      />
    </Suspense>
  );
}
