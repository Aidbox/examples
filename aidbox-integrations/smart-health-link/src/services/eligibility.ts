import type { FhirClient } from './fhir-client.ts';

/**
 * Produces the real-time eligibility (RTE) result.
 *
 * In a real deployment this would call out to a payer's RTE endpoint (e.g. an
 * X12 270/271 transaction) which can take a while to answer. Here we synthesize
 * a FHIR CoverageEligibilityResponse so the example is self-contained.
 */
export class EligibilityService {
  constructor(private readonly fhir: FhirClient) {}

  /**
   * Build and persist a CoverageEligibilityResponse representing a successful
   * eligibility check for the given prospective member.
   */
  async produceResult(input: {
    memberName: string;
    payerName: string;
    memberId: string;
  }): Promise<{ id: string; resource: Record<string, unknown> }> {
    // No registered patient or stored Coverage yet — the prospective member is
    // pre-registration. We carry the coverage and the originating request as
    // contained resources so the response validates while staying self-contained.
    const resource: Record<string, unknown> = {
      resourceType: 'CoverageEligibilityResponse',
      status: 'active',
      purpose: ['benefits'],
      contained: [
        {
          resourceType: 'Coverage',
          id: 'coverage',
          status: 'active',
          beneficiary: { display: input.memberName },
          payor: [{ display: input.payerName }],
          subscriberId: input.memberId,
        },
        {
          resourceType: 'CoverageEligibilityRequest',
          id: 'request',
          status: 'active',
          purpose: ['benefits'],
          patient: { display: input.memberName },
          created: new Date().toISOString(),
          insurer: { display: input.payerName },
        },
      ],
      // No registered patient yet — describe the prospective member inline.
      patient: { display: input.memberName },
      created: new Date().toISOString(),
      request: { reference: '#request' },
      outcome: 'complete',
      disposition: `Member ${input.memberName} is eligible for services under ${input.payerName}.`,
      insurer: { display: input.payerName },
      insurance: [
        {
          coverage: { reference: '#coverage' },
          inforce: true,
          item: [
            {
              category: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/ex-benefitcategory',
                    code: '30',
                    display: 'Health Benefit Plan Coverage',
                  },
                ],
              },
              benefit: [
                {
                  type: {
                    coding: [
                      {
                        system:
                          'http://terminology.hl7.org/CodeSystem/benefit-type',
                        code: 'copay',
                        display: 'Copayment per service',
                      },
                    ],
                  },
                  allowedMoney: { value: 0, currency: 'USD' },
                },
              ],
            },
          ],
        },
      ],
    };

    const created = await this.fhir.create<{ id: string }>(
      'CoverageEligibilityResponse',
      resource
    );
    return { id: created.id, resource: { ...resource, id: created.id } };
  }
}
