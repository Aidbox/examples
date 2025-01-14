"use client";

import { useEffect, useRef } from "react";
import { useAwaiter } from "@/hooks/use-awaiter";
import { Questionnaire } from "fhir/r4";

export function FormsBuilder({
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
        const questionnaire = (e as CustomEvent<Questionnaire>).detail;
        if (onChange && questionnaire) {
          onChange(questionnaire);
        }
      };

      current.addEventListener("change", handler);

      return () => {
        current.removeEventListener("change", handler);
      };
    }
  }, [onChange]);

  useAwaiter(ref);

  return (
    <aidbox-form-builder
      hide-back={true}
      show-share={false}
      hide-population={true}
      hide-extraction={true}
      hide-publish={true}
      hide-add-theme={true}
      hide-edit-theme={true}
      hide-save-theme={true}
      hide-convert={true}
      hide-save={true}
      disable-save={true}
      ref={ref}
      value={JSON.stringify(questionnaire)}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        flex: 1,
      }}
    />
  );
}
