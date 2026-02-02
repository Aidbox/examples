import type {
  LaunchContextItem,
  QuestionnaireContext,
  SdcConfigureContextRequest,
  SdcConfigureRequest,
  SdcDisplayQuestionnaireRequest,
  SdcDisplayQuestionnaireResponseRequest,
  SdcMessageType,
} from "sdc-swm-protocol/src";
import { SDC_MESSAGE_TYPES } from "./constants";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isSdcMessageType(value: string): value is SdcMessageType {
  return SDC_MESSAGE_TYPES.includes(value as SdcMessageType);
}

export function isQuestionnaire(value: unknown): value is fhir4.Questionnaire {
  return isRecord(value) && value.resourceType === "Questionnaire";
}

export function isQuestionnaireResponse(
  value: unknown
): value is fhir4.QuestionnaireResponse {
  return isRecord(value) && value.resourceType === "QuestionnaireResponse";
}

export function resolveQuestionnaire(payload: unknown) {
  if (!isRecord(payload)) return null;
  if (isQuestionnaire(payload)) return payload;
  const candidate = payload.questionnaire;
  if (isQuestionnaire(candidate)) return candidate;
  return null;
}

export function resolveQuestionnaireResponse(payload: unknown) {
  if (!isRecord(payload)) return null;
  if (isQuestionnaireResponse(payload)) return payload;
  const candidate = payload.questionnaireResponse;
  if (isQuestionnaireResponse(candidate)) return candidate;
  return null;
}

export function isLaunchContextItem(value: unknown): value is LaunchContextItem {
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

export function isQuestionnaireContext(
  value: unknown
): value is QuestionnaireContext {
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

export function isSdcConfigurePayload(
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

export function isSdcConfigureContextPayload(
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

export function isDisplayQuestionnairePayload(
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

export function isDisplayQuestionnaireResponsePayload(
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

export function getContextFromPayload(payload: unknown) {
  if (!isRecord(payload)) return undefined;
  const context = payload.context;
  return isQuestionnaireContext(context) ? context : undefined;
}
