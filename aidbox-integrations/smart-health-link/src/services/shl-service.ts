import type { Config } from '../types/config.ts';
import type { ManifestResponse, SHLPayload, SHLFileContentType } from '../types/shl.ts';
import type { SHLinkResource, FileToken } from '../types/shlink-resource.ts';
import { SHLinkStore } from './shlink-store.ts';
import { encryptToJwe, generateShlKey } from '../utils/crypto.ts';
import { encodeShlink } from '../utils/shl-encode.ts';

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
  | { kind: 'gone' }; // expired token

/**
 * The generic SMART Health Links protocol engine — content-agnostic.
 *
 * This is the layer that a built-in Aidbox SHL service would own: it knows the
 * protocol and the security plumbing, but nothing about *what* a link carries or
 * *how* that content is produced. It exposes:
 *   - mintLink()      — create a pending link, return the shlink:
 *   - attachContent() — encrypt finished bytes under the link's key and finalize
 *                       (the seam an external producer calls when its job is done)
 *   - getManifest() / getFile() — the receiver-facing protocol
 *
 * Security plumbing it owns:
 *   - the P (passcode) flag with a *lifetime* incorrect-attempt counter (→ 401
 *     { remainingAttempts }, lock at zero), persisted so parallel requests can't bypass it;
 *   - short-lived `location` file tokens with an expiry (→ 410 Gone);
 *   - per-link manifest poll throttling (→ 429 + Retry-After).
 */
export class ShlService {
  private readonly store: SHLinkStore;

  constructor(
    private readonly config: Config,
    deps: { store: SHLinkStore }
  ) {
    this.store = deps.store;
  }

  /**
   * Mint a pending SMART Health Link. Content is attached later via attachContent().
   * If `passcode` is provided, the link carries the P flag and the manifest is gated.
   */
  async mintLink(input: {
    label: string;
    passcode?: string;
  }): Promise<{ shlinkId: string; shlink: string; payload: SHLPayload }> {
    const key = generateShlKey();
    const passcode = input.passcode?.trim() || undefined;

    const shlink = await this.store.create({
      key,
      label: input.label,
      jobStatus: 'pending',
      ...(passcode
        ? { passcode, remainingAttempts: this.config.shlPolicy.passcodeMaxAttempts }
        : {}),
    });

    return {
      shlinkId: shlink.id!,
      shlink: this.buildShlinkUri(shlink),
      payload: this.buildPayload(shlink),
    };
  }

  /**
   * Attach finished content to a link: encrypt it under the link's key and mark
   * the link `ready`. This is the seam an external content producer calls when
   * its (possibly long-running) job completes. The producer hands over plaintext
   * bytes; the protocol engine owns the encryption.
   */
  async attachContent(
    shlinkId: string,
    content: { bytes: string; contentType: string; sourceRef?: string }
  ): Promise<void> {
    const shlink = await this.store.get(shlinkId);
    if (!shlink) throw new Error(`SHLink ${shlinkId} not found`);

    const jwe = await encryptToJwe(content.bytes, shlink.key, content.contentType);
    await this.store.save({
      ...shlink,
      jobStatus: 'ready',
      contentType: content.contentType,
      sourceRef: content.sourceRef,
      encryptedFile: jwe,
    });
  }

  /** Resolve a manifest request, enforcing throttle + passcode and minting file tokens. */
  async getManifest(
    shlinkId: string,
    opts: { embeddedLengthMax?: number; passcode?: string } = {}
  ): Promise<ManifestResult> {
    const shlink = await this.store.get(shlinkId);
    if (!shlink) return { kind: 'not-found' };

    // --- 429: throttle frequent polls of the same link ---
    const nowMs = Date.now();
    const minMs = this.config.shlPolicy.manifestMinIntervalSeconds * 1000;
    if (shlink.lastManifestAtMs && nowMs - shlink.lastManifestAtMs < minMs) {
      const retryAfterSeconds = Math.ceil((minMs - (nowMs - shlink.lastManifestAtMs)) / 1000);
      return { kind: 'rate-limited', retryAfterSeconds: Math.max(1, retryAfterSeconds) };
    }

    // --- passcode (P flag) ---
    if (shlink.passcode) {
      if (!opts.passcode) return { kind: 'passcode-required' };
      if (opts.passcode !== shlink.passcode) {
        // Lifetime attempt counting: decrement and persist before responding, so
        // parallel requests can't each spend the "last" attempt.
        const remaining = Math.max(0, (shlink.remainingAttempts ?? 0) - 1);
        await this.store.save({ ...shlink, remainingAttempts: remaining, lastManifestAtMs: nowMs });
        return { kind: 'passcode-invalid', remainingAttempts: remaining };
      }
    }

    // Record this (successful-auth) poll for throttling.
    let current: SHLinkResource = { ...shlink, lastManifestAtMs: nowMs };

    if (this.isExpired(current)) {
      await this.store.save(current);
      return { kind: 'ok', manifest: { status: 'no-longer-valid', files: [] } };
    }

    // A passcode-locked link (no attempts left) is no longer resolvable.
    if (current.passcode && (current.remainingAttempts ?? 0) <= 0) {
      await this.store.save(current);
      return { kind: 'ok', manifest: { status: 'no-longer-valid', files: [] } };
    }

    // Job still running: long-term (L) link, contents will change.
    if (current.jobStatus !== 'ready' || !current.encryptedFile) {
      await this.store.save(current);
      return { kind: 'ok', manifest: { status: 'can-change', files: [] } };
    }

    // Ready: embed if allowed, else mint a short-lived location token.
    const jwe = current.encryptedFile;
    const canEmbed =
      opts.embeddedLengthMax === undefined || jwe.length <= opts.embeddedLengthMax;
    // The link records what it carries (set by attachContent) — report that.
    const contentType = (current.contentType ??
      'application/fhir+json') as SHLFileContentType;

    let manifest: ManifestResponse;
    if (canEmbed) {
      manifest = { status: 'finalized', files: [{ contentType, embedded: jwe }] };
    } else {
      const fileToken = this.mintFileToken(current.id!);
      current = { ...current, fileTokens: [...(current.fileTokens ?? []), fileToken] };
      manifest = {
        status: 'finalized',
        files: [
          {
            contentType,
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
   * Tokens embed the SHLink id (`<shlId>~<random>`) so we can look up the link
   * directly without a custom search parameter.
   */
  async getFile(token: string): Promise<FileResult> {
    const shlinkId = token.split('~')[0];
    if (!shlinkId) return { kind: 'not-found' };

    const shlink = await this.store.get(shlinkId);
    if (!shlink || !shlink.encryptedFile) return { kind: 'not-found' };

    const entry = (shlink.fileTokens ?? []).find((t) => t.token === token);
    if (!entry) return { kind: 'not-found' };
    if (Date.now() > entry.expiresAtMs || this.isExpired(shlink)) {
      return { kind: 'gone' };
    }
    return { kind: 'ok', jwe: shlink.encryptedFile };
  }

  // --- internals -----------------------------------------------------------

  private mintFileToken(shlinkId: string): FileToken {
    return {
      // <shlId>~<random> — the prefix lets getFile() find the link without a search param.
      token: `${shlinkId}~${generateShlKey()}`,
      expiresAtMs: Date.now() + this.config.shlPolicy.fileTokenTtlSeconds * 1000,
    };
  }

  private buildPayload(shlink: SHLinkResource): SHLPayload {
    const payload: SHLPayload = {
      url: `${this.config.shl.publicBaseUrl}/manifest/${shlink.id}`,
      key: shlink.key,
      // L: long-term (contents evolve pending -> ready). P added when a passcode is set.
      flag: shlink.passcode ? 'LP' : 'L',
      label: shlink.label,
      v: 1,
    };
    if (shlink.exp !== undefined) payload.exp = shlink.exp;
    return payload;
  }

  private buildShlinkUri(shlink: SHLinkResource): string {
    return encodeShlink(this.buildPayload(shlink), this.config.shl.viewerUrl);
  }

  private isExpired(shlink: SHLinkResource): boolean {
    return shlink.exp !== undefined && shlink.exp < Math.floor(Date.now() / 1000);
  }
}
