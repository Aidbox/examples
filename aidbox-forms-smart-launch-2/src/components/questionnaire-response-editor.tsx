"use client";

import { Questionnaire, QuestionnaireResponse } from "fhir/r4";
import { Suspense, useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { FormsRenderer } from "@/components/forms-renderer";

interface QuestionnaireResponseEditorProps {
  questionnaire: Questionnaire;
  questionnaireResponse: QuestionnaireResponse;
  onSaveAction: (
    questionnaireResponse: QuestionnaireResponse,
  ) => Promise<QuestionnaireResponse>;
}

export function QuestionnaireResponseEditor({
  questionnaire,
  questionnaireResponse,
  onSaveAction,
}: QuestionnaireResponseEditorProps) {
  const [, startTransition] = useTransition();

  return (
    <Suspense fallback={<Spinner expand="true" />}>
      <FormsRenderer
        questionnaire={questionnaire}
        questionnaireResponse={questionnaireResponse}
        onChange={(updatedQuestionnaireResponse) => {
          startTransition(async () => {
            try {
              await onSaveAction(updatedQuestionnaireResponse);
            } catch (error) {
              console.error("Failed to save questionnaire response:", error);
            }
          });
        }}
      />
    </Suspense>
  );
}
