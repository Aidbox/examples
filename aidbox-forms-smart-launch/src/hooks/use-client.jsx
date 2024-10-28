import { createContext, useContext } from "react";
import { client, oauth2 } from "fhirclient";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export const clientId = "aidbox-forms";

// todo: reconsider scopes
const scope = [
  "openid fhirUser", // Request access to current user and its identity
  "profile", // Permission to retrieve information about the current logged-in user
  "online_access", // Request a refresh_token that can be used to obtain a new access token to replace an expired one, and that will be usable for as long as the end-user remains online.

  "launch/patient", // Need patient context at launch time
  "launch/questionnaire", // Request Questionnaire to be included in the launch context
  "launch/questionnaireresponse", // Request QuestionnaireResponse to be included in the launch context

  "patient/Patient.r", // Request read access to Patient resource
  "patient/QuestionnaireResponse.crus", // Request create, read, update access to QuestionnaireResponse resource
].join(" ");

export const publicBuilderClient = client("https://form-builder.aidbox.app");

const clientContext = createContext(null);

export const useClient = () => {
  const client = useContext(clientContext);
  if (!client) {
    throw new Error("No client found in the context");
  }

  return client;
};

export const ClientProvider = ({ children }) => {
  let location = useLocation();

  const { data: client } = useQuery({
    queryKey: ["client"],
    queryFn: () => {
      return oauth2.init({
        clientId,
        scope,
        redirectUri: location.pathname,
      });
    },
    retry: false,
  });

  return (
    <clientContext.Provider value={client}>{children}</clientContext.Provider>
  );
};
