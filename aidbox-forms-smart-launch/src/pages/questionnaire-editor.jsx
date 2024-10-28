import { QuestionnaireBuilder } from "@/components/questionnaire-builder.jsx";
import { useParams } from "react-router-dom";
import { Suspense } from "react";

export const QuestionnaireEditor = () => {
  const { id } = useParams();

  return <QuestionnaireBuilder id={id} />;
};
