export type SystemSendMessageParams = {
  phone: string;
  message: string;
};

export type SystemSendMessageResult = {
  status: string;
};

export type SystemSendMessage = {
  params?: SystemSendMessageParams;
  result?: SystemSendMessageResult;
};
