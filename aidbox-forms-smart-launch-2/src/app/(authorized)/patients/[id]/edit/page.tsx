import { JsonEditor } from "@/components/json-editor";
import { PageHeader } from "@/components/page-header";
import { getCurrentAidbox } from "@/lib/smart";
import { Patient } from "fhir/r4";

interface EditPatientPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPatientPage({
  params,
}: EditPatientPageProps) {
  const { id } = await params;
  const aidbox = await getCurrentAidbox();
  const patient = await aidbox.get(`fhir/Patient/${id}`).json<Patient>();

  return (
    <>
      <PageHeader
        items={[
          { href: "/", label: "Home" },
          { href: "/patients", label: "Patients" },
          {
            label:
              patient.name?.[0]?.given?.[0] +
              " " +
              patient.name?.[0]?.family?.[0],
          },
        ]}
      />
      <JsonEditor initialValue={patient} />
    </>
  );
}
