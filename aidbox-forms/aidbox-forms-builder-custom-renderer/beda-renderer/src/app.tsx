import React from "react";
import { useSmartMessaging } from "aidbox-swm";
import { ErrorView } from "./ui/error-view";
import { BedaForm } from "./renderer/beda-form";

export const App = () => {
  const {
    questionnaire,
    questionnaireResponse,
    context,
    error,
    renderKey,
    sendResponseChanged,
  } = useSmartMessaging({
    application: {
      name: "Beda",
      publisher: "Beda Software",
    },
    capabilities: {
      extraction: false,
      focusChangeNotifications: false,
    },
  });

  if (error) {
    return <ErrorView message={error} />;
  }

  if (!questionnaire) {
    return null;
  }

  return (
    <BedaForm
      key={renderKey}
      questionnaire={questionnaire}
      questionnaireResponse={questionnaireResponse}
      context={context}
      onResponseChange={sendResponseChanged}
    />
  );
};
