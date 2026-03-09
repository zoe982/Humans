const ENTITY_REGISTRY: Record<string, string> = {
  humans: "/api/humans",
  accounts: "/api/accounts",
  activities: "/api/activities",
  opportunities: "/api/opportunities",
  pets: "/api/pets",
  flights: "/api/flights",
  colleagues: "/api/colleagues",
  "general-leads": "/api/general-leads",
  "route-signups": "/api/route-signups",
  "website-booking-requests": "/api/website-booking-requests",
  "evacuation-leads": "/api/evacuation-leads",
};

export const ENTITY_TYPES = Object.keys(ENTITY_REGISTRY);

export const SUPABASE_ENTITIES = new Set([
  "flights",
  "route-signups",
  "website-booking-requests",
  "evacuation-leads",
]);

export function getApiPath(entityType: string): string | null {
  // eslint-disable-next-line security/detect-object-injection
  return ENTITY_REGISTRY[entityType] ?? null;
}

export function parseRealtimePath(
  path: string,
): { entityType: string; id?: string } | null {
  if (!path.startsWith("/api/")) return null;

  const withoutPrefix = path.slice("/api/".length);
  const segments = withoutPrefix.split("/");

  // Try two-segment entity types first (e.g., "general-leads")
  // These have hyphens in the entity name, not in the ID
  const firstSegment = segments[0];
  if (firstSegment === undefined || firstSegment === "") return null;

  // Check if the first segment is a known entity type
  // eslint-disable-next-line security/detect-object-injection
  if (ENTITY_REGISTRY[firstSegment] !== undefined) {
    return {
      entityType: firstSegment,
      id: segments[1] !== undefined && segments[1] !== "" ? segments[1] : undefined,
    };
  }

  return null;
}
