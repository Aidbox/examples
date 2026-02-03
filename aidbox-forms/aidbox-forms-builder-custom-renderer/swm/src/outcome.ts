export type StatusPayload = {
  status: "success" | "error";
  outcome?: fhir4.OperationOutcome;
};

export function buildOutcome(
  severity: fhir4.OperationOutcomeIssue["severity"],
  code: fhir4.OperationOutcomeIssue["code"],
  diagnostics: string
): fhir4.OperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: [
      {
        severity,
        code,
        diagnostics,
      },
    ],
  };
}
