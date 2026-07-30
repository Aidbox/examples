/**
 * Custom Aidbox resource that persists one *assessment share* — the grant that
 * lets Provider Organization B read Provider Organization A's assessments for
 * one patient, within a time window and with selected items hidden.
 *
 * Registered as a first-class resource type via the init bundle. This is the
 * server-side record behind a `shlink:`; the receiver never sees it directly.
 *
 * The key difference from a snapshot-style SHL: nothing is encrypted at mint
 * time. The share stores a *policy* (who, which patient, which window, which
 * items), and every manifest poll re-runs that policy against live data. That
 * is what makes "B sees new assessments as A completes them" work, and what
 * makes revocation immediate — there is no pre-encrypted copy to claw back.
 *
 * Security note: `key` is persisted so the manifest can encrypt a freshly built
 * bundle on each poll. In production you would avoid long-term key storage; see
 * the README's "Notes & scope".
 */

/** A short-lived, manifest-issued handle to the encrypted bundle (the SHL `location` URL). */
export interface FileToken {
  /** Random opaque token used in the file URL, of the form `<shareId>~<random>`. */
  token: string;
  /** Epoch-ms after which the token is dead (spec: <= 1 hour). */
  expiresAtMs: number;
  /**
   * The JWE this token was minted for. A `location` fetch must return exactly
   * the bytes the manifest described, so we freeze the ciphertext per token
   * rather than rebuilding it (which would produce a different, possibly newer,
   * bundle than the manifest advertised).
   */
  jwe: string;
}

/** Why a share stopped resolving. Kept for the audit trail. */
export type ShareStatus = 'active' | 'revoked';

export interface AssessmentShareResource {
  resourceType: 'AssessmentShare';
  id?: string;
  /** Content-encryption key (43-char base64url of 32 bytes). */
  key: string;
  /** Human label surfaced in the shlink: payload, e.g. "GAD-7 assessments for Jane Roe". */
  label: string;

  // --- the parties -------------------------------------------------------
  /** The sharing (source) organization — Provider A. `Organization/<id>`. */
  sourceOrganization: string;
  /** The receiving organization — Provider B. `Organization/<id>`. */
  recipientOrganization: string;
  /** Display name of the recipient org, so the viewer can name it without a lookup. */
  recipientDisplay?: string;

  // --- what is shared ----------------------------------------------------
  /** The patient whose assessments are shared. `Patient/<id>`. */
  patient: string;
  /**
   * Canonical URL of the Questionnaire whose responses are in scope
   * (e.g. the GAD-7). A share covers one instrument, not the whole chart.
   */
  questionnaire: string;

  // --- the time window ---------------------------------------------------
  /** Start of the sharing window, epoch seconds. Before it, the link is not yet live. */
  startsAt: number;
  /** End of the sharing window, epoch seconds. After it, the link closes automatically. */
  endsAt: number;

  // --- field-level redaction --------------------------------------------
  /**
   * `linkId`s of the questionnaire items Provider A chose NOT to share. Items
   * listed here are stripped from every response before encryption, and the
   * omission is recorded in the outgoing bundle so B can see that something was
   * withheld rather than silently missing. Empty/absent means share everything.
   */
  hiddenItems?: string[];
  /**
   * Whether the computed total score may be shared. A GAD-7 total is derivable
   * from the items, so hiding items but keeping the score can leak them back;
   * this flag lets A suppress the score explicitly.
   */
  shareScore?: boolean;

  // --- lifecycle ---------------------------------------------------------
  /** `active` until Provider A revokes it early. */
  status: ShareStatus;
  /** When A revoked the share, epoch seconds. Set only when status is `revoked`. */
  revokedAt?: number;

  // --- passcode (P flag) -------------------------------------------------
  /** Passcode required to resolve the manifest, if the P flag is set. */
  passcode?: string;
  /** Remaining incorrect-passcode attempts over the share's whole lifetime. */
  remainingAttempts?: number;

  // --- location file tokens (short-lived `location` URLs) ----------------
  /** Active file tokens minted by manifest requests. */
  fileTokens?: FileToken[];

  // --- manifest poll throttle (429 / Retry-After) -----------------------
  /** Epoch-ms of the most recent manifest request, for rate-limiting. */
  lastManifestAtMs?: number;

  // --- access audit ------------------------------------------------------
  /**
   * One entry per resolved manifest poll. Provider A can see when B actually
   * looked, and how many assessments were visible at that moment — the
   * accountability half of a time-bounded grant.
   */
  accessLog?: AccessLogEntry[];
}

/** A single successful read of the share by the recipient. */
export interface AccessLogEntry {
  /** Epoch-ms of the poll. */
  atMs: number;
  /** The `recipient` string the receiver sent in the manifest request body. */
  recipient: string;
  /** How many QuestionnaireResponses were visible at that moment. */
  responseCount: number;
}
