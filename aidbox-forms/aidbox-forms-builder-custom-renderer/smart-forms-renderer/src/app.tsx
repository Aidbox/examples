import React from "react";
import {
  SmartMessagingPhase,
  useSmartMessaging,
} from "sdc-smart-web-messaging-react";
import { ErrorView } from "./error-view";
import { SmartFormsView } from "./smart-forms-view";

declare global {
  interface Window {
    __rendererMetrics?: {
      renders: number;
    };
  }
}

export const App = () => {
  const renderCountRef = React.useRef(0);
  if (import.meta.env.DEV) {
    renderCountRef.current += 1;
    window.__rendererMetrics = { renders: renderCountRef.current };
  }
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const {
    questionnaire,
    questionnaireResponse,
    config,
    phase,
    onQuestionnaireResponseChange,
  } = useSmartMessaging({
    application: {
      name: "SmartForms",
      publisher: "Australian e-Health Research Centre",
    },
    capabilities: {
      extraction: false,
      focusChangeNotifications: false,
    },
    onError: (error) => {
      const suffix = error.messageType ? ` (${error.messageType})` : "";
      setErrorMessage(`${error.message}${suffix}`);
    },
  });

  if (phase === SmartMessagingPhase.Disabled) {
    return <ErrorView message="Missing SDC SWM parameters." />;
  }

  if (errorMessage) {
    return <ErrorView message={errorMessage} />;
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
      onResponseChange={onQuestionnaireResponseChange}
      terminologyServerUrl={config?.terminologyServer}
    />
  );
};
