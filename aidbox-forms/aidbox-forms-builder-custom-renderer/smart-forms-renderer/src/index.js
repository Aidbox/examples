import React from "react";
import ReactDOM from "react-dom/client";
import {
  SmartFormsRenderer,
  useQuestionnaireResponseStore,
} from "@aehrc/smart-forms-renderer";

// -----------------------------------------------------------------------------
// SDC SMART Web Messaging (SWM) renderer host page
//
// This file implements a minimal renderer that can be embedded in a host app.
// It follows the SDC SMART Web Messaging protocol:
// - Performs the SWM handshake.
// - Accepts Questionnaire/QuestionnaireResponse payloads.
// - Renders the form using SmartFormsRenderer.
// - Notifies the host when the response changes.
// -----------------------------------------------------------------------------

// Root element where the renderer is mounted.
const rootEl = document.getElementById("root");

// SWM parameters are passed in the URL.
const params = new URLSearchParams(window.location.search);
const messagingHandle = params.get("messaging_handle");
const messagingOrigin = params.get("messaging_origin");
const hostWindow = window.opener || window.parent;

// Current in-memory state.
let currentQuestionnaire = null;
let currentQuestionnaireResponse = null;
let notifyHostResponseChange = null;

// -----------------------------------------------------------------------------
// Messaging helpers
// -----------------------------------------------------------------------------

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function postToHost(message) {
  if (!hostWindow || !messagingOrigin) return;
  hostWindow.postMessage(message, messagingOrigin);
}

// Log messages in a flat format. Only the payload is logged as an object
// to make it easy to inspect in devtools.
function logMessage(direction, info, payload) {
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

// Send a SWM request message (renderer -> host). Used for events.
function sendEvent(messageType, payload) {
  const message = {
    messagingHandle,
    messageId: randomId(),
    messageType,
    payload,
  };
  logMessage("out", message, payload);
  postToHost(message);
}

// Send a SWM response message (renderer -> host). Must include the same
// messageType as the request being answered.
function sendResponse(messageType, responseToMessageId, payload) {
  const message = {
    messagingHandle,
    messageId: randomId(),
    messageType,
    responseToMessageId,
    payload,
  };
  logMessage("out", message, payload);
  postToHost(message);
}

// Helpers to produce consistent OperationOutcome payloads.
function buildOutcome(severity, code, diagnostics) {
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

function sendStatus(messageType, responseToMessageId, status, diagnostics) {
  const payload = { status };
  if (diagnostics) {
    payload.outcome = buildOutcome("error", "invalid", diagnostics);
  }
  sendResponse(messageType, responseToMessageId, payload);
}

// -----------------------------------------------------------------------------
// Payload normalization helpers
// -----------------------------------------------------------------------------
// The protocol allows either a full resource payload or an object containing
// { questionnaire, questionnaireResponse }. These helpers normalize both.

function resolveQuestionnaire(payload) {
  if (!payload) return null;
  if (payload.resourceType === "Questionnaire") return payload;
  const candidate = payload.questionnaire;
  if (candidate && candidate.resourceType === "Questionnaire") return candidate;
  return null;
}

function resolveQuestionnaireResponse(payload) {
  if (!payload) return null;
  if (payload.resourceType === "QuestionnaireResponse") return payload;
  return payload.questionnaireResponse || null;
}

// -----------------------------------------------------------------------------
// Safety checks
// -----------------------------------------------------------------------------

if (!messagingHandle || !messagingOrigin) {
  throw new Error("Missing SDC SWM parameters");
}

// -----------------------------------------------------------------------------
// Renderer component
// -----------------------------------------------------------------------------

const RendererWrapper = ({ questionnaire, questionnaireResponse }) => {
  const updatableResponse =
    useQuestionnaireResponseStore.use.updatableResponse();

  React.useEffect(() => {
    if (notifyHostResponseChange && updatableResponse) {
      notifyHostResponseChange(updatableResponse);
    }
  }, [updatableResponse]);

  if (!questionnaire || questionnaire.resourceType !== "Questionnaire") {
    return null;
  }
  if (!Array.isArray(questionnaire.item)) {
    return null;
  }

  return React.createElement(SmartFormsRenderer, {
    questionnaire,
    questionnaireResponse,
  });
};

const root = rootEl ? ReactDOM.createRoot(rootEl) : null;

function render() {
  if (!root) return;
  root.render(
    React.createElement(RendererWrapper, {
      questionnaire: currentQuestionnaire,
      questionnaireResponse: currentQuestionnaireResponse,
    })
  );
}

// Notify host when the response changes.
notifyHostResponseChange = (response) => {
  currentQuestionnaireResponse = response;
  sendEvent("sdc.ui.changedQuestionnaireResponse", {
    questionnaireResponse: response,
  });
};

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

  const message = event.data || {};
  logMessage("in", message, message.payload);

  if (message.messagingHandle && message.messagingHandle !== messagingHandle) {
    return;
  }
  if (!message.messageType) {
    return;
  }

  switch (message.messageType) {
    case "status.handshake":
      sendResponse("status.handshake", message.messageId, {
        application: {
          name: "SmartForms",
          publisher: "Australian e-Health Research Centre",
        },
        capabilities: {
          extraction: false,
          focusChangeNotifications: false,
        },
      });
      return;

    case "sdc.configure":
      sendStatus("sdc.configure", message.messageId, "success");
      return;

    case "sdc.configureContext":
      sendStatus("sdc.configureContext", message.messageId, "success");
      return;

    case "sdc.displayQuestionnaire": {
      const resolvedQuestionnaire = resolveQuestionnaire(message.payload);
      if (!resolvedQuestionnaire) {
        sendStatus(
          "sdc.displayQuestionnaire",
          message.messageId,
          "error",
          "Missing questionnaire in sdc.displayQuestionnaire."
        );
        return;
      }
      currentQuestionnaire = resolvedQuestionnaire;
      const resolvedResponse = resolveQuestionnaireResponse(message.payload);
      if (resolvedResponse) {
        currentQuestionnaireResponse = resolvedResponse;
      }
      render();
      sendStatus("sdc.displayQuestionnaire", message.messageId, "success");
      return;
    }

    case "sdc.displayQuestionnaireResponse": {
      currentQuestionnaireResponse = resolveQuestionnaireResponse(
        message.payload
      );
      if (!currentQuestionnaireResponse) {
        sendStatus(
          "sdc.displayQuestionnaireResponse",
          message.messageId,
          "error",
          "Missing questionnaireResponse in sdc.displayQuestionnaireResponse."
        );
        return;
      }
      const resolvedQuestionnaire = resolveQuestionnaire(message.payload);
      if (resolvedQuestionnaire) {
        currentQuestionnaire = resolvedQuestionnaire;
      }
      render();
      sendStatus(
        "sdc.displayQuestionnaireResponse",
        message.messageId,
        "success"
      );
      return;
    }

    case "sdc.requestCurrentQuestionnaireResponse":
      if (currentQuestionnaireResponse) {
        sendResponse(
          "sdc.requestCurrentQuestionnaireResponse",
          message.messageId,
          { questionnaireResponse: currentQuestionnaireResponse }
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

    case "sdc.requestExtract":
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

    default:
      sendResponse(message.messageType || "response", message.messageId, {
        status: "error",
        statusDetail: { message: "Unsupported message type" },
      });
  }
});
