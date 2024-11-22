import { useEffect, useRef } from "react";
import { useAwaiter } from "@/hooks/use-awaiter";
import { Questionnaire, QuestionnaireResponse } from "fhir/r4";

export function FormsRenderer({
  questionnaire,
  questionnaireResponse,
  onChange,
}: {
  questionnaire: Questionnaire;
  questionnaireResponse?: QuestionnaireResponse;
  onChange?: (questionnaireResponse: QuestionnaireResponse) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const current = ref.current;

    if (current) {
      const handler = (e: Event) => {
        onChange?.((e as CustomEvent<QuestionnaireResponse>).detail);
      };

      current.addEventListener("change", handler);

      return () => {
        current.removeEventListener("change", handler);
      };
    }
  }, [onChange]);

  useAwaiter(ref);

  return (
    <aidbox-form-renderer
      ref={ref}
      questionnaire={JSON.stringify(questionnaire)}
      questionnaire-response={JSON.stringify(questionnaireResponse)}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        flex: 1,
      }}
    />
  );
}
