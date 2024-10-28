import { Button } from "@/ui/button.jsx";
import { ChevronRight, Stethoscope, User } from "lucide-react";
import { createSmartAppLauncherUrl } from "@/lib/utils.js";
import { clientId } from "@/hooks/use-client.jsx";

export const LaunchInstructions = () => {
  const launchUrl = window.location.href;

  return (
    <>
      <h1 className="text-4xl font-bold mb-4">
        Welcome to Aidbox Forms Smart App
      </h1>
      <div className="mb-4">
        This is a demo smart app for launching Aidbox Forms.
      </div>
      <div className="mb-4">
        Looks like you came here without proper launch context. Please use one
        of the following links to launch the app:
      </div>
      <div className="flex gap-4 mb-4">
        <Button variant="outline" asChild={true}>
          <a
            href={createSmartAppLauncherUrl({
              launchUrl,
              launchType: "provider-ehr",
            })}
          >
            <Stethoscope className="h-14 w-14 text-pink-400 my-4" />
            Provider EHR Launch
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
        <Button variant="outline" asChild={true}>
          <a
            href={createSmartAppLauncherUrl({
              launchUrl,
              launchType: "patient-portal",
            })}
          >
            <User className="h-14 w-14 text-pink-400 my-4" />
            Patient Portal Launch
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
      <div className="mb-4">
        If you want to run this app from within your own EHR system, you can
        register it as a SMART App with the following parameters:
        <ul className="list-disc ml-6 mt-2">
          <li>
            <span className="font-semibold">Launch URL:</span>{" "}
            <code className="bg-gray-50 px-1 py-0.5 rounded border text-sm">
              {launchUrl}
            </code>
          </li>
          <li>
            <span className="font-semibold">Redirect URL:</span>{" "}
            <code className="bg-gray-50 px-1 py-0.5 rounded border text-sm">
              {launchUrl}
            </code>
          </li>
          <li>
            <span className="font-semibold">Client ID:</span>{" "}
            <code className="bg-gray-50 px-1 py-0.5 rounded border text-sm">
              {clientId}
            </code>
          </li>
          <li>
            <span className="font-semibold">PKCE:</span>{" "}
            <code className="bg-gray-50 px-1 py-0.5 rounded border text-sm">
              true
            </code>
          </li>
        </ul>
      </div>
      <div className="mb-4">
        Most pages in this app can serve as entry points. For example, you can
        directly access a form filling page for a patient using a
        Launch/Redirect URL like this:{" "}
        <code className="bg-gray-50 px-1 py-0.5 rounded border text-sm">
          /questionnaire-response/[your-id]
        </code>
        .
      </div>
    </>
  );
};
