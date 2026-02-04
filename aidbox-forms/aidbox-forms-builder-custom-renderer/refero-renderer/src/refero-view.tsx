import React from "react";
import { Provider } from "react-redux";
import { Refero } from "@helsenorge/refero";
import { store, type RootState } from "./store";
import { referoResources } from "./refero-resources";

const RESPONSE_DEBOUNCE_MS = 50;

function getCurrentQuestionnaireResponse(state: RootState) {
  return state.refero?.form?.FormData?.Content ?? null;
}

function useReferoResponse() {
  return React.useSyncExternalStore(
    store.subscribe,
    () => getCurrentQuestionnaireResponse(store.getState() as RootState),
    () => null
  );
}

type ReferoViewProps = {
  questionnaire: fhir4.Questionnaire;
  questionnaireResponse: fhir4.QuestionnaireResponse | null;
  onResponseChange: (response: fhir4.QuestionnaireResponse) => void;
};

export const ReferoView = ({
  questionnaire,
  questionnaireResponse,
  onResponseChange,
}: ReferoViewProps) => {
  const response = useReferoResponse();
  const debounceRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!response) return;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      onResponseChange(response);
    }, RESPONSE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [onResponseChange, response]);

  const handleSave = React.useCallback(
    (nextResponse: fhir4.QuestionnaireResponse) => {
      onResponseChange(nextResponse);
    },
    [onResponseChange]
  );

  const handleSubmit = React.useCallback(
    (nextResponse: fhir4.QuestionnaireResponse) => {
      onResponseChange(nextResponse);
    },
    [onResponseChange]
  );

  return (
    <Provider store={store}>
      <Refero
        questionnaire={questionnaire}
        questionnaireResponse={questionnaireResponse ?? undefined}
        resources={referoResources}
        onSubmit={handleSubmit}
        onSave={handleSave}
        onCancel={() => {}}
        loginButton={<button type="button">Login</button>}
        authorized
        syncQuestionnaireResponse
      />
    </Provider>
  );
};
