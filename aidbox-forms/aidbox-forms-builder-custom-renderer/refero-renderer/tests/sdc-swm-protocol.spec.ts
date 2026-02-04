import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __swmHost: {
      messages: Array<{
        direction: "in" | "out";
        message: SwmMessage;
      }>;
      handle: string;
      sendRequest: (messageType: string, payload: Record<string, unknown>) => string;
    };
  }
}

type SwmMessage = {
  messageType?: string;
  responseToMessageId?: string;
  messagingHandle?: string;
  messageId?: string;
  payload?: unknown;
};

async function waitForMessage(
  page: Page,
  args: {
    messageType?: string;
    responseToMessageId?: string;
    handle?: string;
    containsValue?: string;
  }
) {
  const handle = await page.waitForFunction(
    ({ messageType, responseToMessageId, handle, containsValue }) => {
      const { messages } = window.__swmHost;
      const match = messages.find((entry) => {
        if (entry.direction !== "in") return false;
        const message = entry.message || {};
        if (messageType && message.messageType !== messageType) return false;
        if (responseToMessageId && message.responseToMessageId !== responseToMessageId) {
          return false;
        }
        if (handle && message.messagingHandle && message.messagingHandle !== handle) {
          return false;
        }
        if (!containsValue) return true;
        if (!message.payload || typeof message.payload !== "object") return false;
        const response = (message.payload as {
          questionnaireResponse?: {
            item?: Array<{
              answer?: Array<{ valueString?: string }>;
              item?: unknown[];
            }>;
          };
        }).questionnaireResponse;
        if (!response?.item) return false;
        type QuestionnaireResponseItem = {
          answer?: Array<{ valueString?: string }>;
          item?: QuestionnaireResponseItem[];
        };
        const stack: QuestionnaireResponseItem[] = Array.isArray(response.item)
          ? [...(response.item as QuestionnaireResponseItem[])]
          : [];
        while (stack.length > 0) {
          const item = stack.pop();
          if (!item) continue;
          if (
            Array.isArray(item.answer) &&
            item.answer.some((answer) => answer?.valueString === containsValue)
          ) {
            return true;
          }
          if (item.item) {
            stack.push(...item.item);
          }
        }
        return false;
      });
      return match?.message ?? null;
    },
    args
  );

  return handle.jsonValue();
}

function requireMessage(message: SwmMessage | null, label: string) {
  if (!message) {
    throw new Error(`Expected ${label} message.`);
  }
  return message;
}

function requirePayload<T extends object>(message: SwmMessage, label: string) {
  if (!message.payload || typeof message.payload !== "object") {
    throw new Error(`Expected ${label} payload.`);
  }
  return message.payload as T;
}

async function sendRequest(
  page: Page,
  messageType: string,
  payload: Record<string, unknown>
) {
  return page.evaluate(
    ({ messageType, payload }) => {
      return window.__swmHost.sendRequest(messageType, payload);
    },
    { messageType, payload }
  );
}

async function getRendererRenderCount(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector("#renderer");
    if (!(frame instanceof HTMLIFrameElement)) return null;
    const metrics = frame?.contentWindow?.__rendererMetrics;
    return typeof metrics?.renders === "number" ? metrics.renders : null;
  });
}

test("renderer speaks SDC SMART Web Messaging", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("Missing baseURL");

  await page.goto(`${baseURL}/tests/host.html`);
  await page.waitForFunction(() => window.__swmHost?.handle);

  const handshake = await waitForMessage(page, {
    messageType: "status.handshake",
    handle: await page.evaluate(() => window.__swmHost.handle),
  });

  const handshakeMessage = requireMessage(handshake, "handshake");
  const handshakePayload = requirePayload<{ protocolVersion?: string }>(
    handshakeMessage,
    "handshake"
  );
  expect(handshakePayload.protocolVersion).toBe("1.0");

  const hostHandshakeId = await sendRequest(page, "status.handshake", {
    protocolVersion: "1.0",
    fhirVersion: "R4",
  });

  const hostHandshakeResponse = await waitForMessage(page, {
    messageType: "status.handshake",
    responseToMessageId: hostHandshakeId,
  });

  const hostHandshakeMessage = requireMessage(
    hostHandshakeResponse,
    "host handshake response"
  );
  const hostHandshakePayload = requirePayload<{
    application?: { name?: string };
  }>(hostHandshakeMessage, "host handshake response");
  expect(hostHandshakePayload.application?.name).toBeTruthy();

  const configureId = await sendRequest(page, "sdc.configure", {});

  const configureResponse = await waitForMessage(page, {
    messageType: "sdc.configure",
    responseToMessageId: configureId,
  });

  const configureMessage = requireMessage(
    configureResponse,
    "sdc.configure response"
  );
  const configurePayload = requirePayload<{ status?: string }>(
    configureMessage,
    "sdc.configure response"
  );
  expect(configurePayload.status).toBe("success");

  const contextId = await sendRequest(page, "sdc.configureContext", {
    context: {
      subject: { reference: "Patient/123" },
      author: { reference: "Practitioner/456" },
    },
  });

  const contextResponse = await waitForMessage(page, {
    messageType: "sdc.configureContext",
    responseToMessageId: contextId,
  });

  const contextMessage = requireMessage(
    contextResponse,
    "sdc.configureContext response"
  );
  const contextPayload = requirePayload<{ status?: string }>(
    contextMessage,
    "sdc.configureContext response"
  );
  expect(contextPayload.status).toBe("success");

  const displayId = await sendRequest(page, "sdc.displayQuestionnaire", {
    questionnaire: {
      resourceType: "Questionnaire",
      id: "test-questionnaire",
      status: "draft",
      item: [
        {
          linkId: "name",
          text: "Name",
          type: "string",
        },
      ],
    },
  });

  const displayResponse = await waitForMessage(page, {
    messageType: "sdc.displayQuestionnaire",
    responseToMessageId: displayId,
  });

  const displayMessage = requireMessage(
    displayResponse,
    "sdc.displayQuestionnaire response"
  );
  const displayPayload = requirePayload<{ status?: string }>(
    displayMessage,
    "sdc.displayQuestionnaire response"
  );
  expect(displayPayload.status).toBe("success");

  const inputField = page.frameLocator("#renderer").getByLabel("Name");
  await expect(inputField).toBeVisible({ timeout: 30000 });
  const initialRenderCount = await getRendererRenderCount(page);
  if (initialRenderCount === null) {
    throw new Error("Renderer metrics were not reported.");
  }
  await page.waitForTimeout(2000);
  const laterRenderCount = await getRendererRenderCount(page);
  if (laterRenderCount === null) {
    throw new Error("Renderer metrics were not reported.");
  }
  expect(laterRenderCount).toBeLessThanOrEqual(initialRenderCount + 1);
  await inputField.fill("Alice");

  const changeMessage = await waitForMessage(page, {
    messageType: "sdc.ui.changedQuestionnaireResponse",
    containsValue: "Alice",
  });

  const changeEvent = requireMessage(
    changeMessage,
    "sdc.ui.changedQuestionnaireResponse"
  );
  const changePayload = requirePayload<{
    questionnaireResponse?: fhir4.QuestionnaireResponse;
  }>(changeEvent, "sdc.ui.changedQuestionnaireResponse");
  const changedResponse = changePayload.questionnaireResponse;

  expect(changedResponse?.resourceType).toBe("QuestionnaireResponse");

  const currentResponseId = await sendRequest(
    page,
    "sdc.requestCurrentQuestionnaireResponse",
    {}
  );

  const currentResponse = await waitForMessage(page, {
    messageType: "sdc.requestCurrentQuestionnaireResponse",
    responseToMessageId: currentResponseId,
  });

  const currentMessage = requireMessage(
    currentResponse,
    "sdc.requestCurrentQuestionnaireResponse response"
  );
  const currentPayload = requirePayload<{
    questionnaireResponse?: fhir4.QuestionnaireResponse;
    outcome?: fhir4.OperationOutcome;
  }>(currentMessage, "sdc.requestCurrentQuestionnaireResponse response");
  if (currentPayload.questionnaireResponse) {
    expect(currentPayload.questionnaireResponse.resourceType).toBe(
      "QuestionnaireResponse"
    );
  } else {
    expect(currentPayload.outcome?.resourceType).toBe("OperationOutcome");
  }

  const extractId = await sendRequest(page, "sdc.requestExtract", {});
  const extractResponse = await waitForMessage(page, {
    messageType: "sdc.requestExtract",
    responseToMessageId: extractId,
  });

  const extractMessage = requireMessage(
    extractResponse,
    "sdc.requestExtract response"
  );
  const extractPayload = requirePayload<{
    outcome?: fhir4.OperationOutcome;
  }>(extractMessage, "sdc.requestExtract response");
  expect(extractPayload.outcome?.resourceType).toBe("OperationOutcome");
});
