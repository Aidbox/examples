import { useEffect, useRef } from "react";
import { useAwaiter } from "@/hooks/use-awaiter";
import { Questionnaire, QuestionnaireResponse } from "fhir/r4";

export function FormsRenderer({
  questionnaire,
  questionnaireResponse,
  onChange,
  onSubmit,
  hideFooter,
}: {
  questionnaire: Questionnaire;
  questionnaireResponse?: QuestionnaireResponse;
  onChange?: (questionnaireResponse: QuestionnaireResponse) => void;
  onSubmit?: (questionnaireResponse: QuestionnaireResponse) => void;
  hideFooter?: boolean;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const current = ref.current;

    if (current) {
      const handler = (e: Event) => {
        const questionnaireResponse = (e as CustomEvent<QuestionnaireResponse>)
          .detail;
        if (onChange && questionnaireResponse) {
          onChange(questionnaireResponse);
        }
      };

      current.addEventListener("change", handler);

      return () => {
        current.removeEventListener("change", handler);
      };
    }
  }, [onChange]);

  useEffect(() => {
    const current = ref.current;

    if (current) {
      const handler = (e: Event) => {
        const questionnaireResponse = (e as CustomEvent<QuestionnaireResponse>)
          .detail;
        if (onSubmit && questionnaireResponse) {
          onSubmit(questionnaireResponse);
        }
      };

      current.addEventListener("submit", handler);

      return () => {
        current.removeEventListener("submit", handler);
      };
    }
  }, [onSubmit]);

  useAwaiter(ref);

  return (
    <aidbox-form-renderer
      ref={ref}
      questionnaire={JSON.stringify(questionnaire)}
      questionnaire-response={JSON.stringify(questionnaireResponse)}
      config={JSON.stringify({ form: { "allow-amend": true } })}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        flex: 1,
      }}
      hide-footer={hideFooter}
    />
  );
}
