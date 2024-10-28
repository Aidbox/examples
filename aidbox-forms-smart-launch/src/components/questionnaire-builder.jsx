import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicBuilderClient } from "@/hooks/use-client.jsx";
import { useAwaiter } from "@/hooks/use-awaiter.jsx";

export const QuestionnaireBuilder = ({ id }) => {
  const ref = useRef();

  const { data: questionnaire } = useQuery({
    queryKey: ["questionnaire", id],
    queryFn: () => publicBuilderClient.request(`Questionnaire/${id}`),
  });

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
