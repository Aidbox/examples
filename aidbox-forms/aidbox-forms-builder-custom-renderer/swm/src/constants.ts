import type { SdcMessageType } from "sdc-swm-protocol/src";

export const SDC_MESSAGE_TYPES: SdcMessageType[] = [
  "status.handshake",
  "sdc.configure",
  "sdc.configureContext",
  "sdc.displayQuestionnaire",
  "sdc.displayQuestionnaireResponse",
  "sdc.requestCurrentQuestionnaireResponse",
  "sdc.requestExtract",
  "sdc.ui.changedQuestionnaireResponse",
  "sdc.ui.changedFocus",
  "ui.done",
];
