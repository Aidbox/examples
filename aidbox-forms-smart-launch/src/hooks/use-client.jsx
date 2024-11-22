import { createContext, useContext } from "react";
import { client, oauth2 } from "fhirclient";
import { useSuspenseQuery } from "@tanstack/react-query";

export const clientId = "aidbox-forms";

// todo: reconsider scopes
export const defaultScope = [
  "openid fhirUser", // Request access to current user and its identity
  "profile", // Permission to retrieve information about the current logged-in user
  "online_access", // Request a refresh_token that can be used to obtain a new access token to replace an expired one, and that will be usable for as long as the end-user remains online.

  "launch/patient", // Need patient context at launch time
  "launch/questionnaire", // Request Questionnaire to be included in the launch context
  "launch/questionnaireresponse", // Request QuestionnaireResponse to be included in the launch context

  "user/Questionnaire.crus",

  "patient/Patient.r", // Request read access to Patient resource
  "patient/QuestionnaireResponse.crus", // Request create, read, update access to QuestionnaireResponse resource
];

const correctUrl = "https://form-builder.aidbox.app/fhir";

export const publicBuilderClient = client(correctUrl);

const clientContext = createContext(null);

export const authorize = (options) => {
  const redirectUri = window.location.pathname + window.location.hash;

  return oauth2.authorize({
    clientId,
    redirectUri,
    ...options,
  });
};

export const useClient = () => {
  const client = useContext(clientContext);
  if (!client) {
    throw new Error("No client found in the context");
  }

  return client;
};

export const ClientProvider = ({ children }) => {
  const { searchParams } = new URL(window.location);

  const { data: client } = useSuspenseQuery({
    queryKey: ["client"],
    queryFn: () => {
      const redirectUri = window.location.pathname + window.location.hash;

      if (searchParams.has("error") || searchParams.has("error_description")) {
        return oauth2
          .ready({
            clientId,
            redirectUri,
          })
          .catch((error) => {
            sessionStorage.clear();
            throw error;
          });
      }

      return oauth2.init({
        clientId,
        scope: defaultScope.join(" "),
        redirectUri,
      });
    },
    retry: false,
  });

  return (
    <clientContext.Provider value={client}>{children}</clientContext.Provider>
  );
};
