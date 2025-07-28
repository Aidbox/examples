export type SystemCheckOutWorkflowParams = {
  clientId: string;
};

export type SystemCheckOutWorkflowResult = {
  messageId?: string;
};

export type SystemCheckOutWorkflowError = {
  message?: string;
};

export type SystemCheckOutWorkflow = {
  params?: SystemCheckOutWorkflowParams;
  result?: SystemCheckOutWorkflowResult;
  error?: SystemCheckOutWorkflowError;
};
