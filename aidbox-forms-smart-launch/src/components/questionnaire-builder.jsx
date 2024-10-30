import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { publicBuilderClient, useClient } from "@/hooks/use-client.jsx";
import { useAwaiter } from "@/hooks/use-awaiter.jsx";
import { findQuestionnaireWithClient, saveQuestionnaire } from "@/lib/utils.js";
import { useToast } from "@/hooks/use-toast.js";

export const QuestionnaireBuilder = ({ id }) => {
  const ref = useRef();
  const client = useClient();
  const { toast } = useToast();
  const toastShown = useRef(false);

  const {
    data: [usedClient, questionnaire],
  } = useQuery({
    queryKey: ["questionnaire", id],
    queryFn: () => findQuestionnaireWithClient(client, id),
  });

  const mutation = useMutation({
    mutationFn: (questionnaire) => saveQuestionnaire(usedClient, questionnaire),
    onSuccess: () => {
      if (!toastShown.current) {
        toastShown.current = true;
        toast({
          title: "Questionnaire is autosaved",
          description: "All changes are saved automatically",
        });
      }
    },
  });

  useAwaiter(ref);

  useEffect(() => {
    if (usedClient !== publicBuilderClient) {
      const current = ref.current;
      const handler = (e) => mutation.mutate(e.detail);

      current.addEventListener("change", handler);

      return () => {
        current.removeEventListener("change", handler);
      };
    } else {
      toast({
        title: "This questionnaire is read-only",
        description:
          "You can't save changes to questionnaires from the library. Please import it first to your EHR to make changes.",
      });
    }
  }, []);

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
};
