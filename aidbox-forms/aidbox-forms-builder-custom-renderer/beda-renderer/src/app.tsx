import React from "react";
import {
  SmartMessagingPhase,
  useSmartMessaging,
} from "sdc-smart-web-messaging-react";
import { ErrorView } from "./error-view";
import { BedaForm } from "./beda-form";

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
    context,
    phase,
    onQuestionnaireResponseChange,
  } = useSmartMessaging({
    application: {
      name: "Beda",
      publisher: "Beda Software",
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

  if (!questionnaire) {
    return null;
  }

  return (
    <BedaForm
      questionnaire={questionnaire}
      questionnaireResponse={questionnaireResponse}
      context={context}
      onResponseChange={onQuestionnaireResponseChange}
    />
  );
};
