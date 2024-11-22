import { getCurrentAidbox } from "@/lib/server/smart";
import { PageHeader } from "@/components/page-header";
import { Questionnaire, QuestionnaireResponse } from "fhir/r4";
import { QuestionnaireEditor } from "@/components/questionnaire-editor";
import { getFirst } from "@/lib/utils";
import { QuestionnaireResponseEditor } from "@/components/questionnaire-response-editor";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuestionnaireResponsePage({
  params,
}: PageProps) {
  const aidbox = await getCurrentAidbox();
  const { id } = await params;

  const questionnaireResponse = await aidbox
    .get(`fhir/QuestionnaireResponse/${id}`, {})
    .json<QuestionnaireResponse>();

  if (!questionnaireResponse) {
    throw new Error("Questionnaire response not found");
  }

  const [url, version] = questionnaireResponse.questionnaire?.split("|") || [];

  const questionnaire = await aidbox
    .get(`fhir/Questionnaire?url=${url}&${version ? `version=${version}` : ""}`)
    .json<Questionnaire>()
    .then(getFirst);

  if (!questionnaire) {
    throw new Error("Questionnaire not found");
  }

  async function saveQuestionnaireResponse(
    questionnaireResponse: QuestionnaireResponse,
  ) {
    "use server";

    const aidbox = await getCurrentAidbox();
    return aidbox
      .put(`fhir/QuestionnaireResponse/${id}`, {
        json: questionnaireResponse,
      })
      .json<QuestionnaireResponse>();
  }

  return (
    <>
      <PageHeader
        items={[
          { href: "/", label: "Home" },
          {
            href: "/questionnaire-responses",
            label: "Questionnaire responses",
          },
          { label: "Form filler" },
        ]}
      />
      <QuestionnaireResponseEditor
        questionnaire={questionnaire}
        questionnaireResponse={questionnaireResponse}
        onSaveAction={saveQuestionnaireResponse}
      />
    </>
  );
}
