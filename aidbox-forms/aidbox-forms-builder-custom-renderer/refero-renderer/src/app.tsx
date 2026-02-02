import React from "react";
import "@helsenorge/refero/index.css";
import { useSmartMessaging } from "./swm/use-smart-messaging";
import { ErrorView } from "./ui/error-view";
import { ReferoView } from "./renderer/refero-view";

export const App = () => {
  const {
    questionnaire,
    questionnaireResponse,
    error,
    renderKey,
    sendResponseChanged,
  } = useSmartMessaging({
    application: {
      name: "Refero",
      publisher: "Helsenorge",
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
    <ReferoView
      key={renderKey}
      questionnaire={questionnaire}
      questionnaireResponse={questionnaireResponse}
      onResponseChange={sendResponseChanged}
    />
  );
};
