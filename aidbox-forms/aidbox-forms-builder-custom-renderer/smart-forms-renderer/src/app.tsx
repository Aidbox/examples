import React from "react";
import { useSmartMessaging } from "./swm/use-smart-messaging";
import { ErrorView } from "./ui/error-view";
import { SmartFormsView } from "./renderer/smart-forms-view";

export const App = () => {
  const {
    questionnaire,
    questionnaireResponse,
    config,
    error,
    sendResponseChanged,
  } = useSmartMessaging({
    application: {
      name: "SmartForms",
      publisher: "Australian e-Health Research Centre",
    },
    capabilities: {
      extraction: false,
      focusChangeNotifications: false,
    },
  });

  if (error) {
    return <ErrorView message={error} />;
  }

  if (!questionnaire || questionnaire.resourceType !== "Questionnaire") {
    return null;
  }
  if (!Array.isArray(questionnaire.item)) {
    return null;
  }

  return (
    <SmartFormsView
      questionnaire={questionnaire}
      questionnaireResponse={questionnaireResponse}
      onResponseChange={sendResponseChanged}
      terminologyServerUrl={config?.terminologyServer}
    />
  );
};
