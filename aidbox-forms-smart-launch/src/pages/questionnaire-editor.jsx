import { QuestionnaireBuilder } from "@/components/questionnaire-builder.jsx";
import { useParams } from "react-router-dom";

export const QuestionnaireEditor = () => {
  const { id } = useParams();

  return <QuestionnaireBuilder id={id} />;
};
