import type {
  LaunchContextItem,
  QuestionnaireContext,
  SdcConfigureContextRequest,
  SdcConfigureRequest,
  SdcDisplayQuestionnaireRequest,
  SdcDisplayQuestionnaireResponseRequest,
  SdcUiChangedQuestionnaireResponsePayload,
  SmartWebMessagingEvent,
  SmartWebMessagingRequest,
  SmartWebMessagingResponse,
  SdcResponsePayload,
  SdcEventPayload,
  SdcMessageType,
} from "sdc-swm-protocol/src";
import { isRequest, isResponse } from "sdc-swm-protocol/src";

type LFormsUtil = {
  convertFHIRQuestionnaireToLForms?: (q: fhir4.Questionnaire) => unknown;
  mergeFHIRQuestionnaireResponse?: (
    formDef: unknown,
    qr: fhir4.QuestionnaireResponse
  ) => unknown;
  mergeFHIRDataIntoLForms?: (
    formDef: unknown,
    qr: fhir4.QuestionnaireResponse
  ) => unknown;
  setFHIRQuestionnaireResponse?: (qr: fhir4.QuestionnaireResponse) => void;
  addFormToPage?: (formDef: unknown, containerId: string) => void;
  getFormFHIRData?: (
    resourceType: string,
    fhirVersion?: string
  ) => fhir4.QuestionnaireResponse;
  getFormData?: () => fhir4.QuestionnaireResponse;
};

declare global {
  interface Window {
    LForms?: {
      Util?: LFormsUtil;
    };
  }
}

// -----------------------------------------------------------------------------
// LHC-Forms renderer with SDC SMART Web Messaging (SWM)
// -----------------------------------------------------------------------------

const rootEl = document.getElementById("root");

// SWM parameters are passed in the URL.
const params = new URLSearchParams(window.location.search);
const messagingHandle = params.get("messaging_handle");
const messagingOrigin = params.get("messaging_origin");
const hostWindow = window.opener || window.parent;

// Current in-memory state.
let currentQuestionnaire: fhir4.Questionnaire | null = null;
let currentQuestionnaireResponse: fhir4.QuestionnaireResponse | null = null;
let currentContext: QuestionnaireContext | null = null;
let currentConfig: SdcConfigureRequest["payload"] | null = null;
let notifyHostResponseChange:
  | ((response: fhir4.QuestionnaireResponse) => void)
  | null = null;
let changeTimer: number | null = null;

// Replace the loading placeholder with a readable error message.
function showError(message: string) {
  if (!rootEl) return;
  rootEl.innerHTML = "";
  const box = document.createElement("div");
  box.style.fontFamily = "system-ui, -apple-system, sans-serif";
  box.style.padding = "8px";
  box.style.color = "#b42318";
  box.textContent = message;
  rootEl.appendChild(box);
}

// -----------------------------------------------------------------------------
// Messaging helpers
// -----------------------------------------------------------------------------

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

type AnyOutgoingMessage =
  | SmartWebMessagingRequest<unknown>
  | SmartWebMessagingResponse<unknown>;

function postToHost(message: AnyOutgoingMessage) {
  if (!hostWindow || !messagingOrigin) return;
  hostWindow.postMessage(message, messagingOrigin);
}

type LoggableMessage = Partial<
  SmartWebMessagingRequest<unknown> & SmartWebMessagingResponse<unknown>
>;

const sdcMessageTypes: SdcMessageType[] = [
  "status.handshake",
  "sdc.configure",
  "sdc.configureContext",
  "sdc.displayQuestionnaire",
  "sdc.displayQuestionnaireResponse",
  "sdc.requestCurrentQuestionnaireResponse",
  "sdc.requestExtract",
  "sdc.ui.changedQuestionnaireResponse",
  "sdc.ui.changedFocus",
  "ui.done",
];

function logMessage(
  direction: "in" | "out",
  info: LoggableMessage,
  payload?: unknown
) {
  const messageType = info.messageType || "response";
  const messageId = info.messageId || "-";
  const responseToMessageId = info.responseToMessageId || "-";
  const handle = info.messagingHandle || "-";
  if (payload === undefined) {
    console.log(
      `[${direction}] type=${messageType} id=${messageId} respTo=${responseToMessageId} handle=${handle}`
    );
    return;
  }
  console.log(
    `[${direction}] type=${messageType} id=${messageId} respTo=${responseToMessageId} handle=${handle}`,
    payload
  );
}

function sendEvent<TPayload extends SdcEventPayload>(
  messageType: SdcMessageType,
  payload: TPayload
) {
  const message = {
    messagingHandle,
    messageId: randomId(),
    messageType,
    payload,
  } as SmartWebMessagingEvent<TPayload>;
  logMessage("out", message, payload);
  postToHost(message);
}

function sendResponse<TPayload extends SdcResponsePayload>(
  messageType: SdcMessageType,
  responseToMessageId: string,
  payload: TPayload
) {
  const message = {
    messagingHandle,
    messageId: randomId(),
    messageType,
    responseToMessageId,
    payload,
  } as SmartWebMessagingResponse<TPayload>;
  logMessage("out", message, payload);
  postToHost(message);
}

function buildOutcome(
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

type StatusPayload = {
  status: "success" | "error";
  outcome?: fhir4.OperationOutcome;
};

function sendStatus(
  messageType: SdcMessageType,
  responseToMessageId: string,
  status: StatusPayload["status"],
  diagnostics?: string
) {
  const payload: StatusPayload = { status };
  if (diagnostics) {
    payload.outcome = buildOutcome("error", "invalid", diagnostics);
  }
  sendResponse(messageType, responseToMessageId, payload);
}

// -----------------------------------------------------------------------------
// Payload normalization helpers
// -----------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSdcMessageType(value: string): value is SdcMessageType {
  return sdcMessageTypes.includes(value as SdcMessageType);
}

function isQuestionnaire(value: unknown): value is fhir4.Questionnaire {
  return isRecord(value) && value.resourceType === "Questionnaire";
}

function isQuestionnaireResponse(
  value: unknown
): value is fhir4.QuestionnaireResponse {
  return isRecord(value) && value.resourceType === "QuestionnaireResponse";
}

function resolveQuestionnaire(payload: unknown) {
  if (!isRecord(payload)) return null;
  if (isQuestionnaire(payload)) return payload;
  const candidate = payload.questionnaire;
  if (isQuestionnaire(candidate)) return candidate;
  return null;
}

function resolveQuestionnaireResponse(payload: unknown) {
  if (!isRecord(payload)) return null;
  if (isQuestionnaireResponse(payload)) return payload;
  const candidate = payload.questionnaireResponse;
  if (isQuestionnaireResponse(candidate)) return candidate;
  return null;
}

function isLaunchContextItem(value: unknown): value is LaunchContextItem {
  if (!isRecord(value)) return false;
  if (typeof value.name !== "string") return false;
  if (
    value.contentReference !== undefined &&
    !isRecord(value.contentReference)
  ) {
    return false;
  }
  if (value.contentResource !== undefined && !isRecord(value.contentResource)) {
    return false;
  }
  return true;
}

function isQuestionnaireContext(value: unknown): value is QuestionnaireContext {
  if (!isRecord(value)) return false;
  if (value.subject !== undefined && !isRecord(value.subject)) return false;
  if (value.author !== undefined && !isRecord(value.author)) return false;
  if (value.encounter !== undefined && !isRecord(value.encounter)) return false;
  if (value.launchContext !== undefined) {
    if (!Array.isArray(value.launchContext)) return false;
    if (!value.launchContext.every(isLaunchContextItem)) return false;
  }
  return true;
}

function isSdcConfigurePayload(
  value: unknown
): value is SdcConfigureRequest["payload"] {
  if (!isRecord(value)) return false;
  if (
    value.terminologyServer !== undefined &&
    typeof value.terminologyServer !== "string"
  ) {
    return false;
  }
  if (value.dataServer !== undefined && typeof value.dataServer !== "string") {
    return false;
  }
  if (value.configuration !== undefined && !isRecord(value.configuration)) {
    return false;
  }
  return true;
}

function isSdcConfigureContextPayload(
  value: unknown
): value is SdcConfigureContextRequest["payload"] {
  if (!isRecord(value)) return false;
  if (value.context !== undefined && !isQuestionnaireContext(value.context)) {
    return false;
  }
  return true;
}

type DisplayQuestionnairePayload =
  | SdcDisplayQuestionnaireRequest["payload"]
  | fhir4.Questionnaire;

function isDisplayQuestionnairePayload(
  value: unknown
): value is DisplayQuestionnairePayload {
  if (isQuestionnaire(value)) return true;
  if (!isRecord(value)) return false;
  if (value.questionnaire !== undefined && !isQuestionnaire(value.questionnaire)) {
    return false;
  }
  if (
    value.questionnaireResponse !== undefined &&
    !isQuestionnaireResponse(value.questionnaireResponse)
  ) {
    return false;
  }
  if (value.context !== undefined && !isQuestionnaireContext(value.context)) {
    return false;
  }
  return true;
}

type DisplayQuestionnaireResponsePayload =
  | SdcDisplayQuestionnaireResponseRequest["payload"]
  | fhir4.QuestionnaireResponse;

function isDisplayQuestionnaireResponsePayload(
  value: unknown
): value is DisplayQuestionnaireResponsePayload {
  if (isQuestionnaireResponse(value)) return true;
  if (!isRecord(value)) return false;
  if (
    value.questionnaireResponse !== undefined &&
    !isQuestionnaireResponse(value.questionnaireResponse)
  ) {
    return false;
  }
  if (value.questionnaire !== undefined && !isQuestionnaire(value.questionnaire)) {
    return false;
  }
  return true;
}

function getContextFromPayload(payload: unknown) {
  if (!isRecord(payload)) return undefined;
  const context = payload.context;
  return isQuestionnaireContext(context) ? context : undefined;
}

function mergeLaunchContext(
  existing: LaunchContextItem[] = [],
  incoming: LaunchContextItem[] = []
) {
  const merged = new Map<string, LaunchContextItem>();
  for (const item of existing) merged.set(item.name, item);
  for (const item of incoming) merged.set(item.name, item);
  return Array.from(merged.values());
}

function mergeContext(
  existing: QuestionnaireContext | null,
  incoming?: QuestionnaireContext
) {
  if (!incoming) return existing;
  const merged: QuestionnaireContext = {
    subject: incoming.subject ?? existing?.subject,
    author: incoming.author ?? existing?.author,
    encounter: incoming.encounter ?? existing?.encounter,
  };
  const launchContext = mergeLaunchContext(
    existing?.launchContext ?? [],
    incoming.launchContext ?? []
  );
  if (launchContext.length > 0) {
    merged.launchContext = launchContext;
  }
  return merged;
}

// -----------------------------------------------------------------------------
// LHC-Forms integration helpers
// -----------------------------------------------------------------------------

function lformsUtil(): LFormsUtil | null {
  return window.LForms && window.LForms.Util ? window.LForms.Util : null;
}

function clearRoot() {
  if (rootEl) rootEl.innerHTML = "";
}

function convertQuestionnaire(questionnaire: fhir4.Questionnaire) {
  const util = lformsUtil();
  if (!util) return questionnaire;
  if (typeof util.convertFHIRQuestionnaireToLForms === "function") {
    return util.convertFHIRQuestionnaireToLForms(questionnaire);
  }
  return questionnaire;
}

function applyQuestionnaireResponse(
  formDef: unknown,
  questionnaireResponse: fhir4.QuestionnaireResponse | null
) {
  const util = lformsUtil();
  if (!util || !questionnaireResponse) return formDef;

  if (typeof util.mergeFHIRQuestionnaireResponse === "function") {
    return util.mergeFHIRQuestionnaireResponse(formDef, questionnaireResponse);
  }
  if (typeof util.mergeFHIRDataIntoLForms === "function") {
    return util.mergeFHIRDataIntoLForms(formDef, questionnaireResponse);
  }
  if (typeof util.setFHIRQuestionnaireResponse === "function") {
    util.setFHIRQuestionnaireResponse(questionnaireResponse);
  }

  return formDef;
}

function renderLForms(
  questionnaire: fhir4.Questionnaire,
  questionnaireResponse: fhir4.QuestionnaireResponse | null
) {
  const util = lformsUtil();
  if (!util || !rootEl) return false;

  const baseForm = convertQuestionnaire(questionnaire);
  const mergedForm = applyQuestionnaireResponse(
    baseForm,
    questionnaireResponse
  );

  clearRoot();
  if (typeof util.addFormToPage === "function") {
    const containerId = rootEl.id || "root";
    util.addFormToPage(mergedForm, containerId);
    return true;
  }

  return false;
}

function getCurrentQuestionnaireResponse() {
  const util = lformsUtil();
  if (!util) return null;

  if (typeof util.getFormFHIRData === "function") {
    return util.getFormFHIRData("QuestionnaireResponse", "R4");
  }
  if (typeof util.getFormData === "function") {
    return util.getFormData();
  }

  return null;
}

function scheduleChangeNotification() {
  if (!notifyHostResponseChange) return;
  if (changeTimer) window.clearTimeout(changeTimer);
  changeTimer = window.setTimeout(() => {
    const response = getCurrentQuestionnaireResponse();
    if (response) notifyHostResponseChange(response);
  }, 50);
}

function attachChangeListeners() {
  if (!rootEl) return;
  rootEl.addEventListener("change", scheduleChangeNotification, true);
  rootEl.addEventListener("input", scheduleChangeNotification, true);
}

// -----------------------------------------------------------------------------
// Safety checks
// -----------------------------------------------------------------------------

if (!messagingHandle || !messagingOrigin) {
  showError("Missing SDC SWM parameters.");
  throw new Error("Missing SDC SWM parameters");
}

// -----------------------------------------------------------------------------
// Renderer lifecycle
// -----------------------------------------------------------------------------

notifyHostResponseChange = (response: fhir4.QuestionnaireResponse) => {
  currentQuestionnaireResponse = response;
  const payload: SdcUiChangedQuestionnaireResponsePayload = {
    questionnaireResponse: response,
  };
  sendEvent("sdc.ui.changedQuestionnaireResponse", payload);
};

attachChangeListeners();

// Start the protocol by announcing ourselves.
sendEvent("status.handshake", {
  protocolVersion: "1.0",
  fhirVersion: "R4",
});

// -----------------------------------------------------------------------------
// Message handler
// -----------------------------------------------------------------------------

window.addEventListener("message", (event) => {
  if (!hostWindow || event.source !== hostWindow) return;
  if (event.origin !== messagingOrigin) return;

  const message = event.data ?? {};
  logMessage("in", message, message.payload);

  if (isResponse(message)) {
    return;
  }
  if (!isRequest(message)) {
    return;
  }
  if (!isSdcMessageType(message.messageType)) {
    return;
  }

  if (message.messagingHandle && message.messagingHandle !== messagingHandle) {
    return;
  }

  switch (message.messageType) {
    case "status.handshake":
      sendResponse("status.handshake", message.messageId, {
        application: {
          name: "LHC-Forms",
          publisher:
            "NLM Lister Hill National Center for Biomedical Communications",
        },
        capabilities: {
          extraction: false,
          focusChangeNotifications: false,
        },
      });
      return;

    case "sdc.configure":
      if (!isSdcConfigurePayload(message.payload)) {
        sendStatus(
          "sdc.configure",
          message.messageId,
          "error",
          "Invalid sdc.configure payload."
        );
        return;
      }
      currentConfig = message.payload;
      sendStatus("sdc.configure", message.messageId, "success");
      return;

    case "sdc.configureContext": {
      if (!isSdcConfigureContextPayload(message.payload)) {
        sendStatus(
          "sdc.configureContext",
          message.messageId,
          "error",
          "Invalid sdc.configureContext payload."
        );
        return;
      }
      currentContext = message.payload.context ?? null;
      sendStatus("sdc.configureContext", message.messageId, "success");
      return;
    }

    case "sdc.displayQuestionnaire": {
      if (!isDisplayQuestionnairePayload(message.payload)) {
        sendStatus(
          "sdc.displayQuestionnaire",
          message.messageId,
          "error",
          "Invalid sdc.displayQuestionnaire payload."
        );
        showError("Invalid sdc.displayQuestionnaire payload.");
        return;
      }
      const questionnaire = resolveQuestionnaire(message.payload);

      if (!questionnaire || questionnaire.resourceType !== "Questionnaire") {
        sendStatus(
          "sdc.displayQuestionnaire",
          message.messageId,
          "error",
          "Missing questionnaire in sdc.displayQuestionnaire."
        );
        showError("Missing questionnaire in sdc.displayQuestionnaire.");
        return;
      }

      if (!window.LForms) {
        sendStatus(
          "sdc.displayQuestionnaire",
          message.messageId,
          "error",
          "LHC-Forms script not loaded."
        );
        showError("LHC-Forms script not loaded.");
        return;
      }

      currentContext = mergeContext(
        currentContext,
        getContextFromPayload(message.payload)
      );
      currentQuestionnaire = questionnaire;
      const resolvedResponse = resolveQuestionnaireResponse(message.payload);
      if (resolvedResponse) {
        currentQuestionnaireResponse = resolvedResponse;
      }

      const rendered = renderLForms(
        currentQuestionnaire,
        currentQuestionnaireResponse
      );
      if (!rendered) {
        sendStatus(
          "sdc.displayQuestionnaire",
          message.messageId,
          "error",
          "LHC-Forms renderer is not available."
        );
        showError("LHC-Forms renderer is not available.");
        return;
      }

      sendStatus("sdc.displayQuestionnaire", message.messageId, "success");
      return;
    }

    case "sdc.displayQuestionnaireResponse": {
      if (!isDisplayQuestionnaireResponsePayload(message.payload)) {
        sendStatus(
          "sdc.displayQuestionnaireResponse",
          message.messageId,
          "error",
          "Invalid sdc.displayQuestionnaireResponse payload."
        );
        showError("Invalid sdc.displayQuestionnaireResponse payload.");
        return;
      }
      const questionnaireResponse = resolveQuestionnaireResponse(message.payload);

      if (
        !questionnaireResponse ||
        questionnaireResponse.resourceType !== "QuestionnaireResponse"
      ) {
        sendStatus(
          "sdc.displayQuestionnaireResponse",
          message.messageId,
          "error",
          "Missing questionnaireResponse in sdc.displayQuestionnaireResponse."
        );
        showError(
          "Missing questionnaireResponse in sdc.displayQuestionnaireResponse."
        );
        return;
      }

      if (!window.LForms) {
        sendStatus(
          "sdc.displayQuestionnaireResponse",
          message.messageId,
          "error",
          "LHC-Forms script not loaded."
        );
        showError("LHC-Forms script not loaded.");
        return;
      }

      currentQuestionnaireResponse = questionnaireResponse;
      const questionnaire =
        resolveQuestionnaire(message.payload) ?? currentQuestionnaire;

      if (questionnaire && questionnaire.resourceType === "Questionnaire") {
        currentQuestionnaire = questionnaire;
      }

      if (!currentQuestionnaire) {
        sendStatus(
          "sdc.displayQuestionnaireResponse",
          message.messageId,
          "error",
          "Questionnaire is required to render QuestionnaireResponse."
        );
        showError("Questionnaire is required to render QuestionnaireResponse.");
        return;
      }

      const rendered = renderLForms(
        currentQuestionnaire,
        currentQuestionnaireResponse
      );
      if (!rendered) {
        sendStatus(
          "sdc.displayQuestionnaireResponse",
          message.messageId,
          "error",
          "LHC-Forms renderer is not available."
        );
        showError("LHC-Forms renderer is not available.");
        return;
      }

      sendStatus(
        "sdc.displayQuestionnaireResponse",
        message.messageId,
        "success"
      );
      return;
    }

    case "sdc.requestCurrentQuestionnaireResponse": {
      if (!isRecord(message.payload)) {
        sendResponse(
          "sdc.requestCurrentQuestionnaireResponse",
          message.messageId,
          {
            outcome: buildOutcome(
              "error",
              "invalid",
              "Invalid sdc.requestCurrentQuestionnaireResponse payload."
            ),
          }
        );
        return;
      }
      const response = getCurrentQuestionnaireResponse();
      if (response) {
        sendResponse(
          "sdc.requestCurrentQuestionnaireResponse",
          message.messageId,
          { questionnaireResponse: response }
        );
        return;
      }
      sendResponse("sdc.requestCurrentQuestionnaireResponse", message.messageId, {
        outcome: buildOutcome(
          "error",
          "not-found",
          "No QuestionnaireResponse is currently loaded."
        ),
      });
      return;
    }

    case "sdc.requestExtract": {
      if (!isRecord(message.payload)) {
        sendResponse("sdc.requestExtract", message.messageId, {
          outcome: buildOutcome(
            "error",
            "invalid",
            "Invalid sdc.requestExtract payload."
          ),
        });
        return;
      }
      sendResponse("sdc.requestExtract", message.messageId, {
        outcome: {
          resourceType: "OperationOutcome",
          issue: [
            {
              severity: "error",
              code: "not-supported",
              diagnostics: "Extract is not implemented in this renderer.",
            },
          ],
        },
      });
      return;
    }

    default:
      return;
  }
});
