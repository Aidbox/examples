export interface Resource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

type Ref = { reference?: string } | undefined;

export interface ScopeResult {
  kept: Map<string, Resource[]>;
  dropped: Map<string, number>;
}

const NETWORK_EXT = "http://hl7.org/fhir/us/davinci-pdex-plan-net/StructureDefinition/network-reference";

export function scopeFilter(byType: Map<string, Resource[]>, networkIds: readonly string[]): ScopeResult {
  const networks = new Set(networkIds.map(stripType));
  const exported = new Map([...byType].map(([t, r]) => [t, r.length]));

  const keepOrg = new Set<string>(networks);
  const keepPractitioner = new Set<string>();
  const keepLocation = new Set<string>();

  for (const plan of byType.get("InsurancePlan") ?? []) {
    addRef(keepOrg, plan.ownedBy as Ref);
    addRef(keepOrg, plan.administeredBy as Ref);
  }

  const roles = (byType.get("PractitionerRole") ?? []).filter((role) =>
    ((role.extension as { url?: string; valueReference?: { reference?: string } }[]) ?? []).some(
      (e) => e.url === NETWORK_EXT && e.valueReference?.reference && networks.has(stripType(e.valueReference.reference)),
    ),
  );
  byType.set("PractitionerRole", roles);
  for (const role of roles) {
    addRef(keepPractitioner, role.practitioner as Ref);
    for (const loc of (role.location as Ref[]) ?? []) addRef(keepLocation, loc);
  }

  const oas = (byType.get("OrganizationAffiliation") ?? []).filter((oa) =>
    ((oa.network as Ref[]) ?? []).some((n) => n?.reference && networks.has(stripType(n.reference))),
  );
  byType.set("OrganizationAffiliation", oas);
  for (const oa of oas) {
    addRef(keepOrg, oa.organization as Ref);
    for (const loc of (oa.location as Ref[]) ?? []) addRef(keepLocation, loc);
  }

  const keepIds: Record<string, Set<string>> = {
    Organization: keepOrg,
    Practitioner: keepPractitioner,
    Location: keepLocation,
  };

  const kept = new Map<string, Resource[]>();
  const dropped = new Map<string, number>();
  for (const [type, resources] of byType) {
    const allow = keepIds[type];
    const keep = allow ? resources.filter((r) => allow.has(r.id)) : resources;
    kept.set(type, keep);
    dropped.set(type, (exported.get(type) ?? keep.length) - keep.length);
  }
  return { kept, dropped };
}

function addRef(into: Set<string>, ref: Ref): void {
  if (ref?.reference) into.add(stripType(ref.reference));
}

function stripType(reference: string): string {
  const i = reference.lastIndexOf("/");
  return i >= 0 ? reference.slice(i + 1) : reference;
}
