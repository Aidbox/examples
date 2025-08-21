import { Request, Response } from 'express';
import { Config } from '../types/config';
import { OperationRequest, HealthCardResponse } from '../types/operation';
import { FHIRClient } from '../services/fhir-client';
import { BundleBuilder } from '../services/bundle-builder';
import { HealthCardService } from '../services/health-card';
import {
  validateOperationRequest,
  extractParametersFromResource,
} from '../utils/validation';

export class HealthCardsHandler {
  private fhirClient: FHIRClient;
  private bundleBuilder: BundleBuilder;
  private healthCardService: HealthCardService;

  constructor(config: Config) {
    this.fhirClient = new FHIRClient(config);
    this.bundleBuilder = new BundleBuilder();
    this.healthCardService = new HealthCardService(config);
  }

  async handleHealthCardsIssue(req: Request, res: Response): Promise<void> {
    try {
      const operationRequest: OperationRequest = req.body;

      // Validate the request
      const validation = validateOperationRequest(operationRequest);
      if (!validation.isValid) {
        res.status(400).json({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'invalid',
              details: { text: validation.error },
            },
          ],
        });
        return;
      }

      const patientId = operationRequest.request['route-params'].id;

      // Extract operation parameters from FHIR Parameters resource
      const params = extractParametersFromResource(
        operationRequest.request.resource
      );
      const credentialTypes = params.credentialType;
      const includeIdentityClaim = params.includeIdentityClaim;
      const since = params._since;
      const credentialValueSet = params.credentialValueSet;

      // Validate credential types
      if (!this.healthCardService.validateCredentialTypes(credentialTypes)) {
        res.status(400).json({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'not-supported',
              details: { text: 'Unsupported credential type' },
            },
          ],
        });
        return;
      }

      // Fetch patient data
      const patient = await this.fhirClient.getPatient(patientId);

      // Fetch clinical resources based on credential types
      const resources = await this.fhirClient.getResourcesByType(
        patientId,
        credentialTypes,
        since
      );

      // Filter by value set if specified
      const filteredResources = this.bundleBuilder.filterByValueSet(
        resources,
        credentialValueSet
      );

      if (filteredResources.length === 0) {
        res.status(404).json({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'information',
              code: 'not-found',
              details: {
                text: 'No resources found for the specified criteria',
              },
            },
          ],
        });
        return;
      }

      // Create FHIR Bundle
      const bundle = this.bundleBuilder.createHealthCardBundle(
        patient,
        filteredResources,
        includeIdentityClaim
      );

      // Generate health card
      const healthCard = await this.healthCardService.generateHealthCard(
        bundle,
        credentialTypes
      );

      // Create response
      const response: HealthCardResponse = {
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'verifiableCredential',
            valueString: healthCard,
          },
        ],
      };

      res.status(200).json(response);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Health cards operation error:', error);

      res.status(500).json({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'exception',
            details: {
              text: 'Internal server error during health card generation',
            },
          },
        ],
      });
    }
  }
}
