import type { Config } from '../types/config.ts';
import type { ManifestResponse, SHLPayload, SHLFileContentType } from '../types/shl.ts';
import type {
  AssessmentShareResource,
  FileToken,
} from '../types/assessment-share-resource.ts';
import type { ShareStore } from './share-store.ts';
import { encryptToJwe, generateShlKey } from '../utils/crypto.ts';
import { encodeShlink } from '../utils/shl-encode.ts';

const FHIR_CONTENT_TYPE: SHLFileContentType = 'application/fhir+json';

/** Discriminated outcome of a manifest request, so the handler can pick the HTTP status. */
export type ManifestResult =
  | { kind: 'ok'; manifest: ManifestResponse }
  | { kind: 'not-found' }
  | { kind: 'passcode-required' }
  | { kind: 'passcode-invalid'; remainingAttempts: number }
  | { kind: 'rate-limited'; retryAfterSeconds: number };

/** Discriminated outcome of a file (location) fetch. */
export type FileResult =
  | { kind: 'ok'; jwe: string }
  | { kind: 'not-found' }
  | { kind: 'gone' }; // expired token, or the share window closed

/** Why a share is not currently readable. `open` means it resolves normally. */
export type WindowState = 'not-yet-started' | 'open' | 'ended' | 'revoked';

/**
 * Builds the plaintext a share carries, on demand.
 *
 * The protocol engine below is deliberately ignorant of assessments: it asks the
 * provider for bytes each time a manifest is resolved. That indirection is what
 * makes the share *live* — a new assessment, or a change to what's hidden, shows
 * up on the recipient's next poll with no re-minting.
 */
export interface ContentProvider {
  build(share: AssessmentShareResource): Promise<{ bytes: string; responseCount: number }>;
}

/**
 * The SMART Health Links protocol engine, specialised for *policy-based,
 * time-bounded* shares.
 *
 * Where a snapshot-style SHL encrypts content once at mint time, a share here
 * stores only a policy (patient, questionnaire, window, hidden items) and
 * re-derives its content on every manifest poll through a `ContentProvider`.
 * That single change is what delivers the use case:
 *
 *   - **live** — assessments Provider A completes after minting appear on B's
 *     next poll, because the bundle is rebuilt from live data each time;
 *   - **closable** — the window is checked at read time, so the end date closes
 *     access automatically and an early revoke takes effect immediately. There
 *     is no pre-encrypted copy sitting on the server to claw back;
 *   - **redacted** — the provider applies A's field policy during every build,
 *     so tightening what's shared applies retroactively to the same link.
 *
 * It also owns the protocol's security plumbing:
 *   - the P (passcode) flag with a *lifetime* incorrect-attempt counter (→ 401
 *     { remainingAttempts }, lock at zero), persisted so parallel guesses can't bypass it;
 *   - short-lived `location` file tokens with an expiry (→ 410 Gone);
 *   - per-share manifest poll throttling (→ 429 + Retry-After).
 */
export class ShareService {
  private readonly store: ShareStore;
  private readonly content: ContentProvider;

  constructor(
    private readonly config: Config,
    deps: { store: ShareStore; content: ContentProvider }
  ) {
    this.store = deps.store;
    this.content = deps.content;
  }

  /**
   * Grant Provider B time-bounded access to Provider A's assessments for one
   * patient, and mint the `shlink:` that carries it.
   *
   * Nothing is encrypted here — only the policy is written down.
   */
  async createShare(input: {
    label: string;
    sourceOrganization: string;
    recipientOrganization: string;
    recipientDisplay?: string;
    patient: string;
    questionnaire: string;
    startsAt: number;
    endsAt: number;
    hiddenItems?: string[];
    shareScore?: boolean;
    passcode?: string;
  }): Promise<{ shareId: string; shlink: string; payload: SHLPayload }> {
    if (input.endsAt <= input.startsAt) {
      throw new Error('Share end date must be after the start date');
    }

    const passcode = input.passcode?.trim() || undefined;

    const share = await this.store.create({
      key: generateShlKey(),
      label: input.label,
      sourceOrganization: input.sourceOrganization,
      recipientOrganization: input.recipientOrganization,
      recipientDisplay: input.recipientDisplay,
      patient: input.patient,
      questionnaire: input.questionnaire,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      // Omit when nothing is hidden — FHIR rejects an empty array.
      ...(input.hiddenItems?.length ? { hiddenItems: input.hiddenItems } : {}),
      shareScore: input.shareScore !== false,
      status: 'active',
      ...(passcode
        ? { passcode, remainingAttempts: this.config.shlPolicy.passcodeMaxAttempts }
        : {}),
    });

    const payload = this.buildPayload(share);
    return {
      shareId: share.id!,
      shlink: encodeShlink(payload, this.config.shl.viewerUrl),
      payload,
    };
  }

  /**
   * Close a share before its end date. Provider A's override.
   *
   * Because content is built at read time, this is effective immediately: the
   * next manifest poll resolves to `no-longer-valid`, and outstanding `location`
   * URLs stop working too (getFile re-checks the window, returning 410 Gone).
   */
  async revokeShare(shareId: string): Promise<AssessmentShareResource | null> {
    const share = await this.store.get(shareId);
    if (!share) return null;
    if (share.status === 'revoked') return share;

    // Note we keep `fileTokens`: getFile() re-checks the window, so outstanding
    // location URLs are already dead. Keeping them lets that check report a
    // truthful 410 Gone ("this existed and is now closed") instead of a 404.
    return this.store.save({
      ...share,
      status: 'revoked',
      revokedAt: Math.floor(Date.now() / 1000),
    });
  }

  /** Where a share sits relative to its window and its status, evaluated now. */
  windowState(share: AssessmentShareResource, nowSeconds = Math.floor(Date.now() / 1000)): WindowState {
    if (share.status === 'revoked') return 'revoked';
    if (nowSeconds < share.startsAt) return 'not-yet-started';
    if (nowSeconds >= share.endsAt) return 'ended';
    return 'open';
  }

  /**
   * Resolve a manifest request: enforce throttle, passcode and window, then build
   * and encrypt the current content.
   */
  async getManifest(
    shareId: string,
    opts: { embeddedLengthMax?: number; passcode?: string; recipient?: string } = {}
  ): Promise<ManifestResult> {
    const share = await this.store.get(shareId);
    if (!share) return { kind: 'not-found' };

    // --- 429: throttle frequent polls of the same share ---
    const nowMs = Date.now();
    const minMs = this.config.shlPolicy.manifestMinIntervalSeconds * 1000;
    if (share.lastManifestAtMs && nowMs - share.lastManifestAtMs < minMs) {
      const retryAfterSeconds = Math.ceil((minMs - (nowMs - share.lastManifestAtMs)) / 1000);
      return { kind: 'rate-limited', retryAfterSeconds: Math.max(1, retryAfterSeconds) };
    }

    // --- passcode (P flag) ---
    if (share.passcode) {
      if (!opts.passcode) return { kind: 'passcode-required' };
      if (opts.passcode !== share.passcode) {
        // Lifetime attempt counting: decrement and persist before responding, so
        // parallel requests can't each spend the "last" attempt.
        const remaining = Math.max(0, (share.remainingAttempts ?? 0) - 1);
        await this.store.save({ ...share, remainingAttempts: remaining, lastManifestAtMs: nowMs });
        return { kind: 'passcode-invalid', remainingAttempts: remaining };
      }
    }

    // Record this (successfully authenticated) poll for throttling.
    let current: AssessmentShareResource = { ...share, lastManifestAtMs: nowMs };

    // A passcode-locked share (no attempts left) is no longer resolvable.
    if (current.passcode && (current.remainingAttempts ?? 0) <= 0) {
      await this.store.save(current);
      return { kind: 'ok', manifest: { status: 'no-longer-valid', files: [] } };
    }

    // --- the sharing window ---
    const state = this.windowState(current, Math.floor(nowMs / 1000));
    if (state === 'ended' || state === 'revoked') {
      // Closed for good: the end date passed, or A revoked early.
      await this.store.save(current);
      return { kind: 'ok', manifest: { status: 'no-longer-valid', files: [] } };
    }
    if (state === 'not-yet-started') {
      // The grant exists but hasn't opened yet. `can-change` with no files is the
      // spec's way of saying "nothing to read right now, come back".
      await this.store.save(current);
      return { kind: 'ok', manifest: { status: 'can-change', files: [] } };
    }

    // --- open: build the current content and encrypt it under the share key ---
    const { bytes, responseCount } = await this.content.build(current);
    const jwe = await encryptToJwe(bytes, current.key, FHIR_CONTENT_TYPE);

    // Drop expired tokens on every poll, not just when minting a new one: each
    // one carries a full JWE, so a stale token would otherwise be re-serialized
    // into every save for the rest of the share's life.
    const liveTokens = (current.fileTokens ?? []).filter(isLive);

    current = {
      ...current,
      accessLog: [
        ...(current.accessLog ?? []),
        { atMs: nowMs, recipient: opts.recipient ?? 'unknown', responseCount },
      ].slice(-50), // keep the log bounded
      // Assign only when non-empty: FHIR rejects an empty array outright, and the
      // common (embedded) path mints no token at all.
      ...(liveTokens.length ? { fileTokens: liveTokens } : { fileTokens: undefined }),
    };

    // Embed if the receiver allows it, else hand back a short-lived location URL.
    const canEmbed = opts.embeddedLengthMax === undefined || jwe.length <= opts.embeddedLengthMax;

    let manifest: ManifestResponse;
    if (canEmbed) {
      manifest = {
        // Always `can-change`: the window is open, so new assessments may still
        // appear. A share is never `finalized` — it goes straight to
        // `no-longer-valid` when the window closes.
        status: 'can-change',
        files: [{ contentType: FHIR_CONTENT_TYPE, embedded: jwe }],
      };
    } else {
      // Freeze this exact ciphertext against the token: a `location` fetch must
      // return the bytes this manifest described, not a newer rebuild.
      const fileToken = this.mintFileToken(current.id!, jwe);
      current = { ...current, fileTokens: [...liveTokens, fileToken] };
      manifest = {
        status: 'can-change',
        files: [
          {
            contentType: FHIR_CONTENT_TYPE,
            location: `${this.config.shl.publicBaseUrl}/file/${fileToken.token}`,
          },
        ],
      };
    }

    await this.store.save(current);
    return { kind: 'ok', manifest };
  }

  /**
   * Resolve a `location` file fetch by its short-lived token.
   * Tokens embed the share id (`<shareId>~<random>`) so we can look up the share
   * directly without a custom search parameter.
   */
  async getFile(token: string): Promise<FileResult> {
    const shareId = token.split('~')[0];
    if (!shareId) return { kind: 'not-found' };

    const share = await this.store.get(shareId);
    if (!share) return { kind: 'not-found' };

    const entry = (share.fileTokens ?? []).find((t) => t.token === token);
    if (!entry) return { kind: 'not-found' };

    // Both gates apply: the token's own TTL, and the share window — revoking a
    // share has to invalidate location URLs it already handed out.
    if (Date.now() > entry.expiresAtMs || this.windowState(share) !== 'open') {
      return { kind: 'gone' };
    }
    return { kind: 'ok', jwe: entry.jwe };
  }

  // --- internals -----------------------------------------------------------

  private mintFileToken(shareId: string, jwe: string): FileToken {
    return {
      // <shareId>~<random> — the prefix lets getFile() find the share without a search param.
      token: `${shareId}~${generateShlKey()}`,
      expiresAtMs: Date.now() + this.config.shlPolicy.fileTokenTtlSeconds * 1000,
      jwe,
    };
  }

  buildPayload(share: AssessmentShareResource): SHLPayload {
    return {
      url: `${this.config.shl.publicBaseUrl}/manifest/${share.id}`,
      key: share.key,
      // The sharing end date *is* the link's expiry, so a conformant receiver can
      // see the window without resolving the manifest.
      exp: share.endsAt,
      // L: long-term — contents evolve as A completes assessments. P when a passcode is set.
      flag: share.passcode ? 'LP' : 'L',
      label: share.label,
      v: 1,
    };
  }

  buildShlinkUri(share: AssessmentShareResource): string {
    return encodeShlink(this.buildPayload(share), this.config.shl.viewerUrl);
  }
}

function isLive(token: FileToken): boolean {
  return token.expiresAtMs > Date.now();
}
