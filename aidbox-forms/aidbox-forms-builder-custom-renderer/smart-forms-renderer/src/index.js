import React from "react";
import ReactDOM from "react-dom/client";
import {
  BaseRenderer,
  useBuildForm,
  rendererThemeComponentOverrides,
  rendererThemeOptions,
  useQuestionnaireResponseStore,
} from "@aehrc/smart-forms-renderer";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

const statusEl = document.getElementById("status");
const rootEl = document.getElementById("root");
const portalEl = document.getElementById("portal");

const params = new URLSearchParams(window.location.search);
const messagingHandle = params.get("messaging_handle");
const messagingOrigin = params.get("messaging_origin");
const hostWindow = window.opener || window.parent;

let currentQuestionnaire = null;
let currentQuestionnaireResponse = null;
let notifyHostResponseChange = null;

function setStatus(text, isError) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.toggle("error", Boolean(isError));
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function postToHost(message) {
  if (!hostWindow || !messagingOrigin) return;
  hostWindow.postMessage(message, messagingOrigin);
}

function sendEvent(messageType, payload) {
  postToHost({
    messagingHandle,
    messageId: randomId(),
    messageType,
    payload,
  });
}

function sendResponse(responseToMessageId, payload) {
  postToHost({
    messageId: randomId(),
    responseToMessageId,
    payload,
  });
}

if (!messagingHandle || !messagingOrigin) {
  setStatus(
    "Missing required parameters. Provide ?messaging_handle=...&messaging_origin=...",
    true
  );
  throw new Error("Missing SDC SWM parameters");
}

setStatus("Waiting for questionnaire…");

const cache = createCache({
  key: "css",
  prepend: true,
  container: rootEl || document.head,
});

const theme = createTheme(rendererThemeOptions);
const themeOverrides = rendererThemeComponentOverrides(theme);

theme.components = {
  ...theme.components,
  ...themeOverrides,
  MuiPopover: {
    defaultProps: {
      container: portalEl || rootEl,
    },
  },
  MuiPopper: {
    defaultProps: {
      container: portalEl || rootEl,
    },
  },
  MuiModal: {
    defaultProps: {
      container: portalEl || rootEl,
    },
  },
  MuiDialog: {
    defaultProps: {
      container: portalEl || rootEl,
    },
  },
};

const ShadowThemeProvider = ({ children }) =>
  React.createElement(
    CacheProvider,
    { value: cache },
    React.createElement(ThemeProvider, { theme }, children)
  );

const RendererWrapper = ({ questionnaire, questionnaireResponse }) => {
  const updatableResponse =
    useQuestionnaireResponseStore.use.updatableResponse();

  React.useEffect(() => {
    if (notifyHostResponseChange && updatableResponse) {
      notifyHostResponseChange(updatableResponse);
    }
  }, [updatableResponse]);

  if (!questionnaire) {
    return React.createElement("div", null, "Waiting for questionnaire…");
  }

  const { isLoading, rendererProps } = useBuildForm(
    questionnaire,
    questionnaireResponse || null
  );

  if (isLoading) {
    return React.createElement("div", null, "Loading…");
  }

  return React.createElement(BaseRenderer, rendererProps);
};

const root = rootEl ? ReactDOM.createRoot(rootEl) : null;

function render() {
  if (!root) return;
  root.render(
    React.createElement(
      ShadowThemeProvider,
      null,
      React.createElement(RendererWrapper, {
        questionnaire: currentQuestionnaire,
        questionnaireResponse: currentQuestionnaireResponse,
      })
    )
  );
}

notifyHostResponseChange = (response) => {
  currentQuestionnaireResponse = response;
  sendEvent("sdc.ui.changedQuestionnaireResponse", {
    questionnaireResponse: response,
  });
};

sendEvent("status.handshake", {
  protocolVersion: "1.0",
  fhirVersion: "R4",
});

window.addEventListener("message", (event) => {
  if (!hostWindow || event.source !== hostWindow) return;
  if (event.origin !== messagingOrigin) return;

  const message = event.data || {};
  if (message.messagingHandle && message.messagingHandle !== messagingHandle) {
    return;
  }

  switch (message.messageType) {
    case "status.handshake":
      sendResponse(message.messageId, { status: "success" });
      return;

    case "sdc.displayQuestionnaire":
      currentQuestionnaire = message.payload?.questionnaire || null;
      if (message.payload?.questionnaireResponse) {
        currentQuestionnaireResponse = message.payload.questionnaireResponse;
      }
      setStatus("Questionnaire loaded");
      render();
      sendResponse(message.messageId, { status: "success" });
      return;

    case "sdc.displayQuestionnaireResponse":
      currentQuestionnaireResponse =
        message.payload?.questionnaireResponse || null;
      render();
      sendResponse(message.messageId, { status: "success" });
      return;

    case "sdc.requestCurrentQuestionnaireResponse":
      sendResponse(message.messageId, {
        questionnaireResponse: currentQuestionnaireResponse,
      });
      return;

    case "sdc.requestExtract":
      sendResponse(message.messageId, {
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
      sendResponse(message.messageId, {
        status: "error",
        statusDetail: { message: "Unsupported message type" },
      });
  }
});
