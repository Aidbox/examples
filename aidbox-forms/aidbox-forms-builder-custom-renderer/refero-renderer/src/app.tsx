import React from "react";
import "@helsenorge/refero/index.css";
import {
  SmartMessagingPhase,
  useSmartMessaging,
} from "sdc-smart-web-messaging-react";
import { ErrorView } from "./error-view";
import { ReferoView } from "./refero-view";

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
    phase,
    onQuestionnaireResponseChange,
  } = useSmartMessaging({
    application: {
      name: "Refero",
      publisher: "Helsenorge",
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
    <ReferoView
      questionnaire={questionnaire}
      questionnaireResponse={questionnaireResponse}
      onResponseChange={onQuestionnaireResponseChange}
    />
  );
};
