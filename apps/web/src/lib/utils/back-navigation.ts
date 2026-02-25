const ENTITY_LABELS: Record<string, string> = {
  accounts: "Account",
  agreements: "Agreement",
  activities: "Activity",
  "discount-codes": "Discount Code",
  emails: "Email",
  flights: "Flight",
  "geo-interests": "Geo Interest",
  humans: "Human",
  opportunities: "Opportunity",
  pets: "Pet",
  "phone-numbers": "Phone Number",
  "referral-codes": "Referral Code",
  "route-interests": "Route Interest",
  "social-ids": "Social ID",
  websites: "Website",
  "leads/general-leads": "General Lead",
  "leads/route-signups": "Route Signup",
  "leads/website-booking-requests": "Booking Request",
  "admin/error-log": "Error Log",
  "geo-interests/expressions": "Geo Expression",
  "route-interests/expressions": "Route Expression",
};

// Known entity path segments for validation
const ENTITY_PATTERN =
  /^\/(?:accounts|agreements|activities|discount-codes|emails|flights|geo-interests(?:\/expressions)?|humans|opportunities|pets|phone-numbers|referral-codes|route-interests(?:\/expressions)?|social-ids|websites|leads\/(?:general-leads|route-signups|website-booking-requests)|admin\/error-log)\/[^/]+$/;

/**
 * Derives a singular entity label from a detail page path.
 * e.g. "/accounts/abc123" → "Account"
 */
export function entityLabelFromPath(path: string): string | null {
  // Strip leading slash, then split to get segments before the ID
  const withoutLeadingSlash = path.replace(/^\//, "");
  const segments = withoutLeadingSlash.split("/");

  // Try two-segment prefix first (e.g. "leads/general-leads", "geo-interests/expressions")
  if (segments.length >= 3) {
    const seg0 = segments[0] ?? "";
    const seg1 = segments[1] ?? "";
    const twoSegmentKey = `${seg0}/${seg1}`;
    // eslint-disable-next-line security/detect-object-injection
    const twoSegmentLabel: string | undefined = ENTITY_LABELS[twoSegmentKey];
    if (twoSegmentLabel !== undefined) return twoSegmentLabel;
  }

  // Single-segment prefix (e.g. "accounts")
  const firstSegment = segments[0] ?? "";
  // eslint-disable-next-line security/detect-object-injection
  const singleLabel: string | undefined = ENTITY_LABELS[firstSegment];
  if (segments.length >= 2 && singleLabel !== undefined) return singleLabel;

  return null;
}

/**
 * Validates that a `from` param is a safe relative path matching a known entity detail page.
 * Prevents open redirects by rejecting absolute URLs and unknown paths.
 */
export function isValidFromPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  return ENTITY_PATTERN.test(path);
}
