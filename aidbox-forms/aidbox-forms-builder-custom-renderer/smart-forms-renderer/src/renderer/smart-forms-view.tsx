import React from "react";
import {
  BaseRenderer,
  RendererThemeProvider,
  useBuildForm,
  useQuestionnaireResponseStore,
  useRendererQueryClient,
} from "@aehrc/smart-forms-renderer";
import { QueryClientProvider } from "@tanstack/react-query";

type SmartFormsViewProps = {
  questionnaire: fhir4.Questionnaire;
  questionnaireResponse: fhir4.QuestionnaireResponse | null;
  onResponseChange: (response: fhir4.QuestionnaireResponse) => void;
  terminologyServerUrl?: string;
};

export const SmartFormsView = ({
  questionnaire,
  questionnaireResponse,
  onResponseChange,
  terminologyServerUrl,
}: SmartFormsViewProps) => {
  const updatableResponse =
    useQuestionnaireResponseStore.use.updatableResponse() as
      | fhir4.QuestionnaireResponse
      | null;

  const isBuilding = useBuildForm({
    questionnaire,
    questionnaireResponse: questionnaireResponse ?? undefined,
    terminologyServerUrl,
  });
  const queryClient = useRendererQueryClient();

  React.useEffect(() => {
    if (updatableResponse) {
      onResponseChange(updatableResponse);
    }
  }, [onResponseChange, updatableResponse]);

  if (isBuilding) {
    return (
      <>
        <div>Loading questionnaire...</div>
      </>
    );
  }

  return (
    <>
      <RendererThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BaseRenderer />
        </QueryClientProvider>
      </RendererThemeProvider>
    </>
  );
};
