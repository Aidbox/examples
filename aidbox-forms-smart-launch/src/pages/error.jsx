import { useRouteError } from "react-router-dom";
import { Welcome } from "@/components/welcome.jsx";

export function Error() {
  let error = useRouteError();

  return (
    <div className="p-10">
      {error?.message?.includes("fhirServiceUrl") ? (
        <Welcome />
      ) : (
        <>
          <h1 className="text-4xl font-bold mb-4">
            {error.status ? `${error.status} - ${error.statusText}` : "Error"}
          </h1>
          <div className="mb-2">
            An error occurred while rendering this page.
          </div>
          <pre className="text-xs bg-gray-50 px-1 py-0.5 rounded border overflow-auto empty:hidden">
            {error.message}
          </pre>
        </>
      )}
    </div>
  );
}
