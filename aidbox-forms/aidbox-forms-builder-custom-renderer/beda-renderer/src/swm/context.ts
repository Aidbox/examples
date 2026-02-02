import type { LaunchContextItem, QuestionnaireContext } from "sdc-swm-protocol/src";

export function mergeLaunchContext(
  existing: LaunchContextItem[] = [],
  incoming: LaunchContextItem[] = []
) {
  const merged = new Map<string, LaunchContextItem>();
  for (const item of existing) merged.set(item.name, item);
  for (const item of incoming) merged.set(item.name, item);
  return Array.from(merged.values());
}

export function mergeContext(
  existing: QuestionnaireContext | null,
  incoming?: QuestionnaireContext
) {
  if (!incoming) return existing;
  const merged: QuestionnaireContext = {
    subject: incoming.subject ?? existing?.subject,
    author: incoming.author ?? existing?.author,
    encounter: incoming.encounter ?? existing?.encounter,
  };
  const launchContext = mergeLaunchContext(
    existing?.launchContext ?? [],
    incoming.launchContext ?? []
  );
  if (launchContext.length > 0) {
    merged.launchContext = launchContext;
  }
  return merged;
}
