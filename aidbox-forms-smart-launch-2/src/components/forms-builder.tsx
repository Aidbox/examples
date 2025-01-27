"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useAwaiter } from "@/hooks/use-awaiter";
import { Questionnaire } from "fhir/r4";

function json(x: any) {
  return new Response(JSON.stringify(x), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function FormsBuilder({
  questionnaire,
  onSave,
  onGlobalProxy,
  onCurrentProxy,
}: {
  questionnaire: Questionnaire;
  onSave: (questionnaire: Questionnaire) => Promise<Questionnaire>;
  onGlobalProxy: (url: string, init: RequestInit) => Promise<any>;
  onCurrentProxy: (url: string, init: RequestInit) => Promise<any>;
}) {
  const ref = useRef<HTMLIFrameElement>(null);

  const fetchProxy = useCallback(
    async (url: string, init: RequestInit & { tag: string }) => {
      if (init.tag === "get-questionnaire") {
        return json(questionnaire);
      }

      if (init.tag === "save-questionnaire") {
        const questionnaire = JSON.parse(init.body as string) as Questionnaire;
        onSave(questionnaire);
        return json(questionnaire);
      }

      if (
        init.tag === "validate-questionnaire" ||
        init.tag === "validate-response"
      ) {
        return json(
          await onGlobalProxy(url, init),
        );
      }

      if (
        init.tag === "get-theme" ||
        init.tag === "get-themes" ||
        init.tag === "create-theme" ||
        init.tag === "save-theme" ||
        init.tag === "populate" ||
        init.tag === "extract" ||
        init.tag === "search-choice-options"
      ) {
        return json(
          await onCurrentProxy(url, init),
        );
      }

      if (init.tag === "get-questionnaire-by-id") {
        return json(questionnaire);
      }

      if (init.tag === "check-sub-questionnaire-usage") {
        return json([]);
      }

      if (init.tag === "search-questionnaires-by-url") {
        return json([]);
      }

      console.log("Request url", url, init.tag);
      return null;
    },
    [questionnaire, onSave],
  );

  useLayoutEffect(() => {
    const current = ref.current;

    if (current) {
      // @ts-ignore fetch is a property of web component
      current.fetch = fetchProxy;

      const handler = (e: Event) => {
        const questionnaire = (e as CustomEvent<Questionnaire>).detail;
        if (onSave && questionnaire) {
          onSave(questionnaire);
        }
      };

      current.addEventListener("change", handler);

      return () => {
        current.removeEventListener("change", handler);
      };
    }
  }, [onSave, fetchProxy]);

  useAwaiter(ref);

  return (
    <aidbox-form-builder
      enable-fetch-proxy={true}
      hide-back={true}
      ref={ref}
      form-id="proxied"
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        flex: 1,
      }}
    />
  );
}
