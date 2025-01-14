import { getCurrentAidbox } from "@/lib/server/smart";
import { PageHeader } from "@/components/page-header";
import { Questionnaire } from "fhir/r4";
import { QuestionnaireEditor } from "@/components/questionnaire-editor";
import { HTTPError } from "ky";
import { revalidatePath } from "next/cache";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuestionnairePage({ params }: PageProps) {
  const aidbox = await getCurrentAidbox();
  const { id } = await params;

  const questionnaire = await aidbox
    .get(`fhir/Questionnaire/${id}`, {})
    .json<Questionnaire>();

  async function saveQuestionnaire(questionnaire: Questionnaire) {
    "use server";

    try {
      const aidbox = await getCurrentAidbox();
      await aidbox
        .put(`fhir/Questionnaire/${id}`, {
          json: questionnaire,
        })
        .json<Questionnaire>();

      revalidatePath("/questionnaires");
    } catch (error) {
      if (error instanceof HTTPError) {
        console.dir(await error.response.json(), { depth: 1000 });
      }
      throw error;
    }
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
