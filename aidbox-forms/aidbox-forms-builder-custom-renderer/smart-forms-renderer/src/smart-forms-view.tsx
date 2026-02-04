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
  const lastSentResponseRef = React.useRef<fhir4.QuestionnaireResponse | null>(
    null
  );
  const [buildResponse, setBuildResponse] = React.useState<
    fhir4.QuestionnaireResponse | undefined
  >(questionnaireResponse ?? undefined);
  const updatableResponse =
    useQuestionnaireResponseStore.use.updatableResponse() as
      | fhir4.QuestionnaireResponse
      | null;

  React.useEffect(() => {
    if (questionnaireResponse === lastSentResponseRef.current) {
      return;
    }
    setBuildResponse(questionnaireResponse ?? undefined);
  }, [questionnaireResponse]);

  const isBuilding = useBuildForm({
    questionnaire,
    questionnaireResponse: buildResponse,
    terminologyServerUrl,
  });
  const queryClient = useRendererQueryClient();

  React.useEffect(() => {
    if (updatableResponse) {
      if (updatableResponse === lastSentResponseRef.current) {
        return;
      }
      lastSentResponseRef.current = updatableResponse;
      onResponseChange(updatableResponse);
    }
  }, [onResponseChange, updatableResponse]);

  if (isBuilding) {
    return <div>Loading questionnaire...</div>;
  }

  return (
    <RendererThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BaseRenderer />
      </QueryClientProvider>
    </RendererThemeProvider>
  );
};
