import {
  createSmartMessagingClient,
  type SmartMessagingError,
  type SmartMessagingState,
} from "sdc-smart-web-messaging-client";

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
    __rendererMetrics?: {
      renders: number;
    };
  }
}

const rootEl = document.getElementById("root");
const params = new URLSearchParams(window.location.search);
const messagingHandle = params.get("messaging_handle");
const messagingOrigin = params.get("messaging_origin");
const hostWindow = window.opener || window.parent;

let changeTimer: number | null = null;
let renderCount = 0;
let lastRenderedQuestionnaire: fhir4.Questionnaire | null = null;
let lastRenderedQuestionnaireResponse: fhir4.QuestionnaireResponse | null = null;
let pendingLocalResponse: fhir4.QuestionnaireResponse | null = null;

function recordRender() {
  if (!import.meta.env.DEV) return;
  renderCount += 1;
  window.__rendererMetrics = { renders: renderCount };
}

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

function lformsUtil(): LFormsUtil | null {
  return window.LForms?.Util ? window.LForms.Util : null;
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
  const mergedForm = applyQuestionnaireResponse(baseForm, questionnaireResponse);

  clearRoot();
  if (typeof util.addFormToPage === "function") {
    const containerId = rootEl.id || "root";
    util.addFormToPage(mergedForm, containerId);
    recordRender();
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

if (!messagingHandle || !messagingOrigin) {
  showError("Missing SDC SWM parameters.");
  throw new Error("Missing SDC SWM parameters");
}

const client = createSmartMessagingClient({
  application: {
    name: "LHC-Forms",
    publisher: "NLM Lister Hill National Center for Biomedical Communications",
  },
  capabilities: {
    extraction: false,
    focusChangeNotifications: false,
  },
  onError: (error: SmartMessagingError) => {
    if (
      !error.messageType ||
      error.messageType === "sdc.displayQuestionnaire" ||
      error.messageType === "sdc.displayQuestionnaireResponse"
    ) {
      showError(error.message);
    }
  },
});

function syncRenderer(state: SmartMessagingState) {
  const questionnaire = state.questionnaire;
  if (!questionnaire) return;

  if (
    pendingLocalResponse &&
    pendingLocalResponse === state.questionnaireResponse &&
    lastRenderedQuestionnaire === questionnaire
  ) {
    lastRenderedQuestionnaireResponse = state.questionnaireResponse;
    pendingLocalResponse = null;
    return;
  }

  if (
    lastRenderedQuestionnaire === questionnaire &&
    lastRenderedQuestionnaireResponse === state.questionnaireResponse
  ) {
    return;
  }

  if (!window.LForms) {
    showError("LHC-Forms script not loaded.");
    return;
  }

  const rendered = renderLForms(questionnaire, state.questionnaireResponse);
  if (!rendered) {
    showError("LHC-Forms renderer is not available.");
    return;
  }

  lastRenderedQuestionnaire = questionnaire;
  lastRenderedQuestionnaireResponse = state.questionnaireResponse;
  pendingLocalResponse = null;
}

function scheduleChangeNotification() {
  if (changeTimer) window.clearTimeout(changeTimer);
  changeTimer = window.setTimeout(() => {
    const response = getCurrentQuestionnaireResponse();
    if (!response) return;
    pendingLocalResponse = response;
    client.onQuestionnaireResponseChange(response);
  }, 50);
}

function attachChangeListeners() {
  if (!rootEl) return;
  rootEl.addEventListener("change", scheduleChangeNotification, true);
  rootEl.addEventListener("input", scheduleChangeNotification, true);
}

attachChangeListeners();
syncRenderer(client.getState());
client.subscribe(syncRenderer);
