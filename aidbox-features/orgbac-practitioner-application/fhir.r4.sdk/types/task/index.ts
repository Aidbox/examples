import type { SystemSendMessage } from './SystemSendMessage';

type WaitTaskDuration = {
  duration: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  until?: never;
};

type WaitTaskUntil = {
  duration?: never;
  until: string;
};

export type TaskDefinitionsMap = {
  'awf.task/wait': {
    params: WaitTaskDuration | WaitTaskUntil;
    result: Record<string, unknown>;
  };
  'system/SendMessage': SystemSendMessage;
};

export declare const TaskDefinitionsNameMap: Record<keyof TaskDefinitionsMap, string>;
