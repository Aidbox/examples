import type { SystemCheckOutWorkflow } from './SystemCheckOutWorkflow';

export type WorkflowDefinitionsMap = {
  'system/CheckOutWorkflow': SystemCheckOutWorkflow;
};

export declare const WorkflowDefinitionsNameMap: Record<keyof WorkflowDefinitionsMap, string>;
