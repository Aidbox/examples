import type { Config } from '../types/config.ts';
import type { SHLPayload } from '../types/shl.ts';
import { ShlService } from './shl-service.ts';
import { EligibilityService } from './eligibility.ts';

const FHIR_CONTENT_TYPE = 'application/fhir+json';

/**
 * The application-side (use-case-specific) orchestration.
 *
 * This is the part that stays *external* to a built-in SHL service: it knows the
 * eligibility use case — how to run the (possibly long) RTE job and what content
 * to produce. It uses the generic protocol engine (ShlService) only through its
 * seams: mint a link up front, then attach the finished content when the job ends.
 *
 *   kickOff() → ShlService.mintLink()            (returns shlink: immediately)
 *             → runJob() in the background        (produce result, then…)
 *             → ShlService.attachContent()        (encrypt + finalize the link)
 */
export class EligibilityWorkflow {
  constructor(
    private readonly config: Config,
    private readonly shl: ShlService,
    private readonly eligibility: EligibilityService
  ) {}

  /**
   * Start an eligibility check: mint the link, kick off the async job, and return
   * the shlink: right away. The result is produced and attached in the background.
   */
  async kickOff(input: {
    memberName: string;
    payerName: string;
    memberId: string;
    passcode?: string;
  }): Promise<{ shlinkId: string; shlink: string; payload: SHLPayload }> {
    const minted = await this.shl.mintLink({
      label: `Eligibility result for ${input.memberName}`,
      passcode: input.passcode,
    });

    // Run the (simulated) long-running RTE job without blocking the response.
    void this.runJob(minted.shlinkId, input);

    return minted;
  }

  private async runJob(
    shlinkId: string,
    input: { memberName: string; payerName: string; memberId: string }
  ): Promise<void> {
    try {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.rte.processingSeconds * 1000)
      );

      const { id, resource } = await this.eligibility.produceResult(input);

      // Hand the finished content to the protocol engine, which encrypts + finalizes.
      await this.shl.attachContent(shlinkId, {
        bytes: JSON.stringify(resource),
        contentType: FHIR_CONTENT_TYPE,
        sourceRef: `CoverageEligibilityResponse/${id}`,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`RTE job ${shlinkId} failed:`, err);
    }
  }
}
