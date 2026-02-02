import type {
  SdcEventPayload,
  SdcMessageType,
  SdcResponsePayload,
  SmartWebMessagingEvent,
  SmartWebMessagingRequest,
  SmartWebMessagingResponse,
} from "sdc-swm-protocol/src";

export type AnyOutgoingMessage =
  | SmartWebMessagingRequest<unknown>
  | SmartWebMessagingResponse<unknown>;

export type LoggableMessage = Partial<
  SmartWebMessagingRequest<unknown> & SmartWebMessagingResponse<unknown>
>;

export type Logger = (
  direction: "in" | "out",
  info: LoggableMessage,
  payload?: unknown
) => void;

export function createLogger(enabled: boolean): Logger {
  if (!enabled) {
    return () => {};
  }

  return (direction, info, payload) => {
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
  };
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

type MessengerOptions = {
  messagingHandle: string | null;
  messagingOrigin: string | null;
  hostWindow: Window | null;
  log: Logger;
};

export function createMessenger(options: MessengerOptions) {
  const { messagingHandle, messagingOrigin, hostWindow, log } = options;

  const postToHost = (message: AnyOutgoingMessage) => {
    if (!hostWindow || !messagingOrigin) return;
    hostWindow.postMessage(message, messagingOrigin);
  };

  const sendEvent = <TPayload extends SdcEventPayload>(
    messageType: SdcMessageType,
    payload: TPayload
  ) => {
    if (!messagingHandle) return;
    const message = {
      messagingHandle,
      messageId: randomId(),
      messageType,
      payload,
    } as SmartWebMessagingEvent<TPayload>;
    log("out", message, payload);
    postToHost(message);
  };

  const sendResponse = <TPayload extends SdcResponsePayload>(
    messageType: SdcMessageType,
    responseToMessageId: string,
    payload: TPayload
  ) => {
    if (!messagingHandle) return;
    const message = {
      messagingHandle,
      messageId: randomId(),
      messageType,
      responseToMessageId,
      payload,
    } as SmartWebMessagingResponse<TPayload>;
    log("out", message, payload);
    postToHost(message);
  };

  return { sendEvent, sendResponse };
}
