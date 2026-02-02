import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  QuestionnaireContext,
  SdcConfigureRequest,
  SdcRequestExtractRequest,
  SdcRequestExtractResponse,
  SdcRequestCurrentQuestionnaireResponseResponse,
  SdcUiChangedQuestionnaireResponsePayload,
  SdcMessageType,
} from "sdc-swm-protocol/src";
import { isRequest, isResponse } from "sdc-swm-protocol/src";
import { mergeContext } from "./context";
import {
  getContextFromPayload,
  isDisplayQuestionnairePayload,
  isDisplayQuestionnaireResponsePayload,
  isRecord,
  isSdcConfigureContextPayload,
  isSdcConfigurePayload,
  isSdcMessageType,
  resolveQuestionnaire,
  resolveQuestionnaireResponse,
} from "./guards";
import { buildOutcome, StatusPayload } from "./outcome";
import { useLatestRef } from "../hooks/use-latest-ref";
import { createLogger, createMessenger } from "./transport";

const DEBUG_SW_MESSAGING = import.meta.env.VITE_SDC_SWM_DEBUG === "true";

type UseSmartMessagingOptions = {
  application: {
    name: string;
    publisher?: string;
    version?: string;
  };
  capabilities?: {
    extraction?: boolean;
    focusChangeNotifications?: boolean;
  };
  onRequestExtract?: (
    payload: SdcRequestExtractRequest["payload"]
  ) => Promise<SdcRequestExtractResponse["payload"]> | SdcRequestExtractResponse["payload"];
};

type UseSmartMessagingResult = {
  questionnaire: fhir4.Questionnaire | null;
  questionnaireResponse: fhir4.QuestionnaireResponse | null;
  context: QuestionnaireContext | null;
  config: SdcConfigureRequest["payload"] | null;
  error: string | null;
  renderKey: number;
  sendResponseChanged: (response: fhir4.QuestionnaireResponse) => void;
};

export function useSmartMessaging(
  options: UseSmartMessagingOptions
): UseSmartMessagingResult {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const messagingHandle = params.get("messaging_handle");
  const messagingOrigin = params.get("messaging_origin");
  const hostWindow = useMemo(() => window.opener || window.parent, []);

  const [questionnaire, setQuestionnaireState] =
    useState<fhir4.Questionnaire | null>(null);
  const [questionnaireResponse, setQuestionnaireResponseState] =
    useState<fhir4.QuestionnaireResponse | null>(null);
  const [context, setContextState] = useState<QuestionnaireContext | null>(null);
  const [config, setConfigState] = useState<SdcConfigureRequest["payload"] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);

  const questionnaireRef = useRef(questionnaire);
  const responseRef = useRef(questionnaireResponse);
  const contextRef = useRef(context);
  const configRef = useRef(config);
  const handshakeSent = useRef(false);
  const optionsRef = useLatestRef(options);

  const setQuestionnaire = useCallback((value: fhir4.Questionnaire | null) => {
    questionnaireRef.current = value;
    setQuestionnaireState(value);
  }, []);

  const setQuestionnaireResponse = useCallback(
    (value: fhir4.QuestionnaireResponse | null) => {
      responseRef.current = value;
      setQuestionnaireResponseState(value);
    },
    []
  );

  const setContext = useCallback((value: QuestionnaireContext | null) => {
    contextRef.current = value;
    setContextState(value);
  }, []);

  const setConfig = useCallback((value: SdcConfigureRequest["payload"] | null) => {
    configRef.current = value;
    setConfigState(value);
  }, []);

  const logger = useMemo(() => createLogger(DEBUG_SW_MESSAGING), []);
  const { sendEvent, sendResponse } = useMemo(
    () =>
      createMessenger({
        messagingHandle,
        messagingOrigin,
        hostWindow,
        log: logger,
      }),
    [hostWindow, logger, messagingHandle, messagingOrigin]
  );

  const sendStatus = useCallback(
    (
      messageType: SdcMessageType,
      responseToMessageId: string,
      status: StatusPayload["status"],
      diagnostics?: string
    ) => {
      const payload: StatusPayload = { status };
      if (diagnostics) {
        payload.outcome = buildOutcome("error", "invalid", diagnostics);
      }
      sendResponse(messageType, responseToMessageId, payload);
    },
    [sendResponse]
  );

  const sendResponseChanged = useCallback(
    (response: fhir4.QuestionnaireResponse) => {
      setQuestionnaireResponse(response);
      const payload: SdcUiChangedQuestionnaireResponsePayload = {
        questionnaireResponse: response,
      };
      sendEvent("sdc.ui.changedQuestionnaireResponse", payload);
    },
    [sendEvent, setQuestionnaireResponse]
  );

  useEffect(() => {
    if (!messagingHandle || !messagingOrigin) {
      setError("Missing SDC SWM parameters.");
      return;
    }
    if (handshakeSent.current) return;
    sendEvent("status.handshake", {
      protocolVersion: "1.0",
      fhirVersion: "R4",
    });
    handshakeSent.current = true;
  }, [messagingHandle, messagingOrigin, sendEvent]);

  useEffect(() => {
    if (!hostWindow || !messagingOrigin) return;

    const handler = (event: MessageEvent) => {
      if (event.source !== hostWindow) return;
      if (event.origin !== messagingOrigin) return;

      const message = event.data ?? {};
      logger("in", message, message.payload);

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
        case "status.handshake": {
          sendResponse("status.handshake", message.messageId, {
            application: optionsRef.current.application,
            capabilities: optionsRef.current.capabilities,
          });
          return;
        }

        case "sdc.configure": {
          if (!isSdcConfigurePayload(message.payload)) {
            sendStatus(
              "sdc.configure",
              message.messageId,
              "error",
              "Invalid sdc.configure payload."
            );
            return;
          }
          setConfig(message.payload);
          sendStatus("sdc.configure", message.messageId, "success");
          return;
        }

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
          setContext(message.payload.context ?? null);
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
            setError("Invalid sdc.displayQuestionnaire payload.");
            return;
          }
          const resolvedQuestionnaire = resolveQuestionnaire(message.payload);
          if (!resolvedQuestionnaire) {
            sendStatus(
              "sdc.displayQuestionnaire",
              message.messageId,
              "error",
              "Missing questionnaire in sdc.displayQuestionnaire."
            );
            setError("Missing questionnaire in sdc.displayQuestionnaire.");
            return;
          }
          setError(null);
          setContext(mergeContext(contextRef.current, getContextFromPayload(message.payload)));
          setQuestionnaire(resolvedQuestionnaire);
          const resolvedResponse = resolveQuestionnaireResponse(message.payload);
          if (resolvedResponse) {
            setQuestionnaireResponse(resolvedResponse);
          }
          setRenderKey((value) => value + 1);
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
            setError("Invalid sdc.displayQuestionnaireResponse payload.");
            return;
          }
          const resolvedResponse = resolveQuestionnaireResponse(message.payload);
          if (!resolvedResponse) {
            sendStatus(
              "sdc.displayQuestionnaireResponse",
              message.messageId,
              "error",
              "Missing questionnaireResponse in sdc.displayQuestionnaireResponse."
            );
            setError(
              "Missing questionnaireResponse in sdc.displayQuestionnaireResponse."
            );
            return;
          }
          setQuestionnaireResponse(resolvedResponse);
          const resolvedQuestionnaire = resolveQuestionnaire(message.payload);
          if (resolvedQuestionnaire) {
            setQuestionnaire(resolvedQuestionnaire);
          }
          if (!questionnaireRef.current && !resolvedQuestionnaire) {
            sendStatus(
              "sdc.displayQuestionnaireResponse",
              message.messageId,
              "error",
              "Questionnaire is required to render QuestionnaireResponse."
            );
            setError("Questionnaire is required to render QuestionnaireResponse.");
            return;
          }
          setError(null);
          setRenderKey((value) => value + 1);
          sendStatus("sdc.displayQuestionnaireResponse", message.messageId, "success");
          return;
        }

        case "sdc.requestCurrentQuestionnaireResponse": {
          if (!isRecord(message.payload)) {
            const payload: SdcRequestCurrentQuestionnaireResponseResponse["payload"] = {
              outcome: buildOutcome(
                "error",
                "invalid",
                "Invalid sdc.requestCurrentQuestionnaireResponse payload."
              ),
            };
            sendResponse(
              "sdc.requestCurrentQuestionnaireResponse",
              message.messageId,
              payload
            );
            return;
          }
          if (responseRef.current) {
            sendResponse(
              "sdc.requestCurrentQuestionnaireResponse",
              message.messageId,
              { questionnaireResponse: responseRef.current }
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
          if (optionsRef.current.onRequestExtract) {
            void Promise.resolve(
              optionsRef.current.onRequestExtract(
                message.payload as SdcRequestExtractRequest["payload"]
              )
            ).then((payload) => {
              sendResponse("sdc.requestExtract", message.messageId, payload);
            });
            return;
          }
          sendResponse("sdc.requestExtract", message.messageId, {
            outcome: buildOutcome(
              "error",
              "not-supported",
              "Extract is not implemented in this renderer."
            ),
          });
          return;
        }

        default:
          return;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [
    hostWindow,
    logger,
    messagingHandle,
    messagingOrigin,
    sendResponse,
    sendStatus,
    sendEvent,
    setConfig,
    setContext,
    setQuestionnaire,
    setQuestionnaireResponse,
  ]);

  return {
    questionnaire,
    questionnaireResponse,
    context,
    config,
    error,
    renderKey,
    sendResponseChanged,
  };
}
