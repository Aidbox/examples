import * as React from "react";
import { useLaunchContext } from "@/hooks/use-launch-context.jsx";
import { constructName } from "@/lib/utils.js";

export function Dashboard() {
  const { user } = useLaunchContext();
  return (
    <div className="p-6 overflow-auto flex-1">
      <h1 className="mb-4 text-2xl font-bold">
        Welcome, {constructName(user.name)}
      </h1>
      <div className="text-muted-foreground">
        {user.resourceType === "Patient" ? (
          <div className="space-y-2">
            <p>
              This is a demo patient portal dashboard. Currently, only the
              questionnaire and questionnaire response functionalities are
              available.
            </p>
            <p>In a fully functional version, you could:</p>
            <ul className="list-disc ml-6">
              <li>View and manage your upcoming appointments.</li>
              <li>
                Access your medical records, including lab results, diagnoses,
                and treatment history.
              </li>
              <li>Communicate securely with your healthcare providers.</li>
              <li>Maintain and update your personal health information.</li>
              <li>
                Explore educational resources related to your health conditions
                and treatments.
              </li>
            </ul>
            <p>For now, you can explore and submit/amend your responses.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p>
              This is a demo practitioner EHR dashboard. Currently, only the
              questionnaire and questionnaire response functionalities are
              available.
            </p>
            <p>In a fully functional version, you could:</p>
            <ul className="list-disc ml-6">
              <li>Access and manage patient records.</li>
              <li>Schedule and manage patient appointments.</li>
              <li>Review lab results and other diagnostic information.</li>
              <li>Prescribe medications and generate referrals.</li>
              <li>
                Communicate with patients and other healthcare professionals.
              </li>
              <li>Generate reports and analyze data.</li>
            </ul>
            <p>
              For now, you can create and manage questionnaires, and review
              patient responses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
