export interface PurgeOperation {
  id: string;
  patientId: string;
  status: 'in-progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  progress: {
    totalResourceTypes: number;
    processedResourceTypes: number;
    currentResourceType?: string;
    deletedResourcesCount: number;
  };
  outcome?: OperationOutcome;
  errors: string[];
}

export interface ResourceDeletion {
  resourceType: string;
  conditionalParams: string;
  historyTableName: string;
}

export interface DeleteResult {
  success: boolean;
  method: 'conditional' | 'individual';
  count?: number;
  error?: string;
}

export interface OperationOutcome {
  resourceType: 'OperationOutcome';
  issue: Array<{
    severity: 'information' | 'warning' | 'error' | 'fatal';
    code: string;
    details: { text: string };
  }>;
}

export interface AidboxBundle {
  resourceType: 'Bundle';
  entry?: Array<{
    resource: any;
  }>;
  link?: Array<{
    relation: string;
    url: string;
  }>;
}

export interface PurgeRequest {
  method: string;
  url: string;
  params: {
    id: string;
  };
}