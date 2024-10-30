import { createContext, useContext } from "react";
import { client, oauth2 } from "fhirclient";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

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

export const publicBuilderClient = client("https://form-builder.aidbox.app");

const clientContext = createContext(null);

export const authorize = (options) => {
  return oauth2.authorize({
    clientId,
    redirectUri: window.location.pathname,
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
  const [searchParams] = useSearchParams();

  const { data: client } = useQuery({
    queryKey: ["client"],
    queryFn: () => {
      if (searchParams.has("error") || searchParams.has("error_description")) {
        return oauth2
          .ready({
            clientId,
            redirectUri: window.location.pathname,
          })
          .catch((error) => {
            sessionStorage.clear();
            throw error;
          });
      }

      return oauth2.init({
        clientId,
        scope: defaultScope.join(" "),
        redirectUri: window.location.pathname,
      });
    },
    retry: false,
  });

  return (
    <clientContext.Provider value={client}>{children}</clientContext.Provider>
  );
};
