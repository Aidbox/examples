import { Request, Response } from 'express';
import { OperationRequest } from '../types/operation';
import { HealthCardService, NoResourcesError } from '../services/health-card';
import {
  validateOperationRequest,
  extractParametersFromResource,
} from '../utils/validation';

function operationOutcome(
  code: string,
  text: string | undefined,
  severity: 'error' | 'information' = 'error'
): object {
  return {
    resourceType: 'OperationOutcome',
    issue: [{ severity, code, details: { text } }],
  };
}

export class HealthCardsHandler {
  constructor(private healthCardService: HealthCardService) {}

  async handleHealthCardsIssue(req: Request, res: Response): Promise<void> {
    try {
      const operationRequest: OperationRequest = req.body;

      const validation = validateOperationRequest(operationRequest);
      if (!validation.isValid) {
        res.status(400).json(operationOutcome('invalid', validation.error));
        return;
      }

      const patientId = operationRequest.request['route-params'].id;
      const params = extractParametersFromResource(
        operationRequest.request.resource
      );

      if (!this.healthCardService.validateCredentialTypes(params.credentialType)) {
        res
          .status(400)
          .json(operationOutcome('not-supported', 'Unsupported credential type'));
        return;
      }

      const { jws, resourceLinks } = await this.healthCardService.issueForPatient(
        patientId,
        params.credentialType,
        {
          since: params._since,
          includeIdentityClaim: params.includeIdentityClaim,
          credentialValueSet: params.credentialValueSet,
        }
      );

      // OUT Parameters: the verifiableCredential plus a resourceLink per bundled
      // resource, mapping each `resource:N` entry to its live FHIR URL.
      const parameter: object[] = [{ name: 'verifiableCredential', valueString: jws }];
      for (const link of resourceLinks) {
        parameter.push({
          name: 'resourceLink',
          part: [
            { name: 'vcIndex', valueInteger: 0 },
            { name: 'bundledResource', valueUri: link.bundledResource },
            { name: 'hostedResource', valueUri: link.hostedResource },
          ],
        });
      }

      res.status(200).json({ resourceType: 'Parameters', parameter });
    } catch (error) {
      if (error instanceof NoResourcesError) {
        res
          .status(404)
          .json(operationOutcome('not-found', error.message, 'information'));
        return;
      }

      // eslint-disable-next-line no-console
      console.error('Health cards operation error:', error);
      res
        .status(500)
        .json(
          operationOutcome(
            'exception',
            'Internal server error during health card generation'
          )
        );
    }
  }
}
