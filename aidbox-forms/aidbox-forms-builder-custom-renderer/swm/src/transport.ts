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

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

type MessengerOptions = {
  messagingHandle: string | null;
  messagingOrigin: string | null;
  hostWindow: Window | null;
};

export function createMessenger(options: MessengerOptions) {
  const { messagingHandle, messagingOrigin, hostWindow } = options;

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
    postToHost(message);
  };

  return { sendEvent, sendResponse };
}
