import React from "react";
import {
  SmartFormsRenderer,
  useQuestionnaireResponseStore,
} from "@aehrc/smart-forms-renderer";

type SmartFormsViewProps = {
  questionnaire: fhir4.Questionnaire;
  questionnaireResponse: fhir4.QuestionnaireResponse | null;
  onResponseChange: (response: fhir4.QuestionnaireResponse) => void;
};

export const SmartFormsView = ({
  questionnaire,
  questionnaireResponse,
  onResponseChange,
}: SmartFormsViewProps) => {
  const updatableResponse =
    useQuestionnaireResponseStore.use.updatableResponse() as
      | fhir4.QuestionnaireResponse
      | null;

  React.useEffect(() => {
    if (updatableResponse) {
      onResponseChange(updatableResponse);
    }
  }, [onResponseChange, updatableResponse]);

  return (
    <SmartFormsRenderer
      questionnaire={questionnaire}
      questionnaireResponse={questionnaireResponse ?? undefined}
    />
  );
};
