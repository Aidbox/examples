import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __swmHost: {
      messages: Array<{
        direction: "in" | "out";
        message: Record<string, unknown>;
      }>;
      handle: string;
      sendRequest: (messageType: string, payload: Record<string, unknown>) => string;
    };
  }
}

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
        const response = message.payload?.questionnaireResponse;
        if (!response?.item) return false;
        const stack = [...response.item];
        while (stack.length > 0) {
          const item = stack.pop();
          if (!item) continue;
          if (item.answer?.some((answer) => answer.valueString === containsValue)) {
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

test("renderer speaks SDC SMART Web Messaging", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("Missing baseURL");

  await page.goto(`${baseURL}/tests/host.html`);
  await page.waitForFunction(() => window.__swmHost?.handle);

  const handshake = await waitForMessage(page, {
    messageType: "status.handshake",
    handle: await page.evaluate(() => window.__swmHost.handle),
  });

  expect(handshake).toBeTruthy();
  expect(handshake.payload?.protocolVersion).toBe("1.0");

  const hostHandshakeId = await sendRequest(page, "status.handshake", {
    protocolVersion: "1.0",
    fhirVersion: "R4",
  });

  const hostHandshakeResponse = await waitForMessage(page, {
    messageType: "status.handshake",
    responseToMessageId: hostHandshakeId,
  });

  expect(hostHandshakeResponse.payload?.application?.name).toBeTruthy();

  const configureId = await sendRequest(page, "sdc.configure", {});

  const configureResponse = await waitForMessage(page, {
    messageType: "sdc.configure",
    responseToMessageId: configureId,
  });

  expect(configureResponse.payload?.status).toBe("success");

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

  expect(contextResponse.payload?.status).toBe("success");

  const displayId = await sendRequest(page, "sdc.displayQuestionnaire", {
    questionnaire: {
      resourceType: "Questionnaire",
      id: "test-questionnaire",
      meta: {
        profile: [
          "https://emr-core.beda.software/StructureDefinition/fhir-emr-questionnaire",
        ],
      },
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

  expect(displayResponse.payload?.status).toBe("success");

  const inputField = page
    .frameLocator("#renderer")
    .getByLabel("Name", { exact: false });
  await expect(inputField).toBeVisible({ timeout: 30000 });
  await inputField.fill("Alice");

  const changeMessage = await waitForMessage(page, {
    messageType: "sdc.ui.changedQuestionnaireResponse",
    containsValue: "Alice",
  });

  const changedResponse = changeMessage.payload?.questionnaireResponse;

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

  if (currentResponse.payload?.questionnaireResponse) {
    expect(currentResponse.payload.questionnaireResponse.resourceType).toBe(
      "QuestionnaireResponse"
    );
  } else {
    expect(currentResponse.payload?.outcome?.resourceType).toBe(
      "OperationOutcome"
    );
  }

  const extractId = await sendRequest(page, "sdc.requestExtract", {});
  const extractResponse = await waitForMessage(page, {
    messageType: "sdc.requestExtract",
    responseToMessageId: extractId,
  });

  expect(extractResponse.payload?.outcome?.resourceType).toBe(
    "OperationOutcome"
  );
});
