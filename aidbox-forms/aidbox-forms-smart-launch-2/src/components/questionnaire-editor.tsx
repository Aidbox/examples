"use client";

import { FormsBuilder } from "@/components/forms-builder";
import { Questionnaire } from "fhir/r4";
import { Suspense } from "react";
import { Spinner } from "@/components/spinner";

interface QuestionnaireEditorProps {
  questionnaire: Questionnaire;
  onSaveAction: (questionnaire: Questionnaire) => Promise<Questionnaire>;
  onGlobalProxyAction: (url: string, init: RequestInit) => Promise<any>;
  onCurrentProxyAction: (url: string, init: RequestInit) => Promise<any>;
}

export function QuestionnaireEditor({
  questionnaire,
  onSaveAction,
  onGlobalProxyAction,
  onCurrentProxyAction,
}: QuestionnaireEditorProps) {
  return (
    <Suspense fallback={<Spinner expand="true" />}>
      <FormsBuilder
        questionnaire={questionnaire}
        onSave={onSaveAction}
        onGlobalProxy={onGlobalProxyAction}
        onCurrentProxy={onCurrentProxyAction}
      />
    </Suspense>
  );
}
