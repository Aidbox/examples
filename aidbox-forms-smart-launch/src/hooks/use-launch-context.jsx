import { createContext, useContext, useEffect, useState } from "react";
import { useClient, publicBuilderClient } from "@/hooks/use-client.jsx";
import { useQuery } from "@tanstack/react-query";

const readLaunchResource = async (client, resourceType) => {
  const { fhirContext } = client?.state?.tokenResponse;

  const [id] = fhirContext?.filter(({ reference }) => {
    // todo: check canonical too
    if (reference.startsWith(`${resourceType}/`)) {
      return reference.split("/")[1];
    }
  });

  if (id) {
    return (
      resourceType === "Questionnaire" ? publicBuilderClient : client
    ).request(`${resourceType}/${id}`);
  } else {
    throw new Error(`No ${resourceType} in the launch context`);
  }
};

export const readLaunchContext = async (client) => {
  const [p, e, u, q, qr] = await Promise.allSettled([
    client.patient.read(),
    client.encounter.read(),
    client.user.read(),
    readLaunchResource(client, "Questionnaire"),
    readLaunchResource(client, "QuestionnaireResponse"),
  ]);

  return {
    patient: p.status === "fulfilled" ? p.value : null,
    encounter: e.status === "fulfilled" ? e.value : null,
    user: u.status === "fulfilled" ? u.value : null,
    questionnaire: q.status === "fulfilled" ? q.value : null,
    questionnaireResponse: qr.status === "fulfilled" ? qr.value : null,
  };
};

const launchContext = createContext(null);

export const useLaunchContext = () => {
  const context = useContext(launchContext);
  if (!context) {
    throw new Error("No launch context found in the context");
  }
  return context;
};

export const LaunchContextProvider = ({ children }) => {
  const client = useClient();

  const { data } = useQuery({
    queryKey: ["launch-context"],
    queryFn: () => readLaunchContext(client),
  });

  return (
    <launchContext.Provider value={data}>{children}</launchContext.Provider>
  );
};
