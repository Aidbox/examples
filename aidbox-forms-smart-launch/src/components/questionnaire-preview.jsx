import { useClient } from "@/hooks/use-client.jsx";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast.js";
import { useAwaiter } from "@/hooks/use-awaiter.jsx";
import { findQuestionnaire } from "@/lib/utils.js";

export const QuestionnairePreview = ({ id }) => {
  const ref = useRef();
  const client = useClient();

  const { data: questionnaire } = useSuspenseQuery({
    queryKey: ["questionnaire", id],
    queryFn: () => findQuestionnaire(client, id),
  });

  const { toast } = useToast();

  useEffect(() => {
    const current = ref.current;

    const handler = (e) => {
      if (e.detail.status === "completed" || e.detail.status === "amended") {
        toast({
          title: "Not saved",
          description: "This is a preview, changes will not be saved",
        });
      }
    };

    current.addEventListener("change", handler);

    return () => {
      current.removeEventListener("change", handler);
    };
  }, []);

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
};
