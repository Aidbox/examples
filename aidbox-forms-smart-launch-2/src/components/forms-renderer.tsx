import { useEffect, useRef } from "react";
import { useAwaiter } from "@/hooks/use-awaiter";
import { Questionnaire } from "fhir/r4";

export function FormsRenderer({
  questionnaire,
  onChange,
}: {
  questionnaire: Questionnaire;
  onChange?: (questionnaire: Questionnaire) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const current = ref.current;

    if (current) {
      const handler = (e: Event) => {
        onChange?.((e as CustomEvent<Questionnaire>).detail);
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
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        flex: 1,
      }}
    />
  );
}
