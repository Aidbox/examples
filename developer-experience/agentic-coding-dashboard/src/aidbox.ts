import { AidboxClient, BasicAuthProvider } from "@health-samurai/aidbox-client";
import type { Bundle, OperationOutcome } from "./fhir-types/hl7-fhir-r4-core";

const baseUrl = process.env.AIDBOX_URL ?? "http://localhost:8080";
const username = process.env.AIDBOX_CLIENT_ID ?? "basic";
const password = process.env.AIDBOX_CLIENT_SECRET ?? "secret";

export const aidbox = new AidboxClient<Bundle, OperationOutcome>(
  baseUrl,
  // @ts-expect-error Bun's fetch type has extra properties not in the SDK's AuthProvider interface
  new BasicAuthProvider(baseUrl, username, password),
);
