import { useParams } from "react-router-dom";
import { useClient } from "@/hooks/use-client.jsx";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useAwaiter } from "@/hooks/use-awaiter.jsx";
import { useEffect, useRef } from "react";
import { findQuestionnaire, saveQuestionnaireResponse } from "@/lib/utils.js";

export const QuestionnaireResponse = () => {
  const ref = useRef();
  const { id } = useParams();
  const client = useClient();
  const queryClient = useQueryClient();

  const { data: questionnaireResponse } = useSuspenseQuery({
    queryKey: ["questionnaire-response", id],
    queryFn: () => client.request(`QuestionnaireResponse/${id}`),
  });

  const questionnaireRef = questionnaireResponse.questionnaire;

  const { data: questionnaire } = useSuspenseQuery({
    queryKey: ["questionnaire", questionnaireRef],
    queryFn: () => findQuestionnaire(client, questionnaireRef),
  });

  const mutation = useMutation({
    mutationFn: saveQuestionnaireResponse.bind(null, client, questionnaire),
    onSuccess: (qr) => {
      queryClient.setQueryData(["questionnaire-response", id], qr);
    },
  });

  useEffect(() => {
    const current = ref.current;
    const handler = (e) => mutation.mutate(e.detail);

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
      questionnaire-response={JSON.stringify(questionnaireResponse)}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        flex: 1,
      }}
    />
  );
};
