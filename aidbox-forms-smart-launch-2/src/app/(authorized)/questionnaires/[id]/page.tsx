import { getCurrentAidbox } from "@/lib/server/smart";
import { PageHeader } from "@/components/page-header";
import { Questionnaire } from "fhir/r4";
import { QuestionnaireEditor } from "@/components/questionnaire-editor";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuestionnairesPage({ params }: PageProps) {
  const aidbox = await getCurrentAidbox();
  const { id } = await params;

  const questionnaire = await aidbox
    .get(`fhir/Questionnaire/${id}`, {})
    .json<Questionnaire>();

  async function saveQuestionnaire(questionnaire: Questionnaire) {
    "use server";

    const aidbox = await getCurrentAidbox();
    return aidbox
      .put(`fhir/Questionnaire/${id}`, {
        json: questionnaire,
      })
      .json<Questionnaire>();
  }

  return (
    <>
      <PageHeader
        items={[
          { href: "/", label: "Home" },
          { href: "/questionnaires", label: "Questionnaires" },
          { label: "Editor" },
        ]}
      />
      <QuestionnaireEditor
        questionnaire={questionnaire}
        onSaveAction={saveQuestionnaire}
      />
    </>
  );
}
