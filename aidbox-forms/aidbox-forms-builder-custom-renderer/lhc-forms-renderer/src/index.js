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
let currentQuestionnaire = null;
let currentQuestionnaireResponse = null;
let notifyHostResponseChange = null;
let changeTimer = null;

// Replace the loading placeholder with a readable error message.
function showError(message) {
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

function postToHost(message) {
  if (!hostWindow || !messagingOrigin) return;
  hostWindow.postMessage(message, messagingOrigin);
}

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
// LHC-Forms integration helpers
// -----------------------------------------------------------------------------

function lformsUtil() {
  return window.LForms && window.LForms.Util ? window.LForms.Util : null;
}

function clearRoot() {
  if (rootEl) rootEl.innerHTML = "";
}

function convertQuestionnaire(questionnaire) {
  const util = lformsUtil();
  if (!util) return questionnaire;
  if (typeof util.convertFHIRQuestionnaireToLForms === "function") {
    return util.convertFHIRQuestionnaireToLForms(questionnaire);
  }
  return questionnaire;
}

function applyQuestionnaireResponse(formDef, questionnaireResponse) {
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

function renderLForms(questionnaire, questionnaireResponse) {
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
  if (changeTimer) clearTimeout(changeTimer);
  changeTimer = setTimeout(() => {
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

notifyHostResponseChange = (response) => {
  currentQuestionnaireResponse = response;
  sendEvent("sdc.ui.changedQuestionnaireResponse", {
    questionnaireResponse: response,
  });
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
          name: "LHC-Forms",
          publisher: "NLM Lister Hill National Center for Biomedical Communications",
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
      const questionnaire =
        message.payload && message.payload.questionnaire
          ? message.payload.questionnaire
          : message.payload;

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

      currentQuestionnaire = questionnaire;
      currentQuestionnaireResponse =
        message.payload && message.payload.questionnaireResponse
          ? message.payload.questionnaireResponse
          : currentQuestionnaireResponse;

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
      const questionnaireResponse =
        message.payload && message.payload.questionnaireResponse
          ? message.payload.questionnaireResponse
          : message.payload;

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
        message.payload && message.payload.questionnaire
          ? message.payload.questionnaire
          : currentQuestionnaire;

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
