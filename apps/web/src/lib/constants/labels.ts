/** Human type display labels */
export const humanTypeLabels: Record<string, string> = {
  client: "Client",
  trainer: "Trainer",
  travel_agent: "Travel Agent",
  flight_broker: "Flight Broker",
};

/** Activity type display labels */
export const activityTypeLabels: Record<string, string> = {
  email: "Email",
  whatsapp_message: "WhatsApp",
  online_meeting: "Meeting",
  phone_call: "Phone Call",
  social_message: "Social",
};

/** Activity type options for SearchableSelect */
export const ACTIVITY_TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "whatsapp_message", label: "WhatsApp" },
  { value: "online_meeting", label: "Meeting" },
  { value: "phone_call", label: "Phone Call" },
  { value: "social_message", label: "Social" },
] as const;

/** Role options for SearchableSelect */
export const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "agent", label: "Agent" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
] as const;

/** Signup status display labels */
export const signupStatusLabels: Record<string, string> = {
  open: "Open",
  qualified: "Qualified",
  closed_converted: "Converted",
  closed_rejected: "Rejected",
};

/** Booking request status display labels */
export const bookingRequestStatusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  closed_cancelled: "Cancelled",
};

/** Deposit status display labels */
export const depositStatusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
};

/** Balance status display labels */
export const balanceStatusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
};

/** General lead status display labels */
export const generalLeadStatusLabels: Record<string, string> = {
  open: "Open",
  qualified: "Qualified",
  closed_converted: "Converted",
  closed_rejected: "Rejected",
};

/** General lead source display labels */
export const generalLeadSourceLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  direct_referral: "Direct Referral",
};

/** General lead source options for SearchableSelect */
export const GENERAL_LEAD_SOURCE_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "direct_referral", label: "Direct Referral" },
] as const;

/** Opportunity stage display labels */
export const opportunityStageLabels: Record<string, string> = {
  open: "Open",
  qualified: "Qualified",
  deposit_request_sent: "Deposit Requested",
  deposit_received: "Deposit Received",
  group_forming: "Group Forming",
  confirmed_to_operate: "Confirmed",
  paid: "Paid",
  docs_in_progress: "Docs in Progress",
  docs_complete: "Docs Complete",
  closed_flown: "Closed - Flown",
  closed_lost: "Closed - Lost",
};

/** Opportunity stage options ordered for pipeline progression */
export const OPPORTUNITY_STAGE_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "qualified", label: "Qualified" },
  { value: "deposit_request_sent", label: "Deposit Requested" },
  { value: "deposit_received", label: "Deposit Received" },
  { value: "group_forming", label: "Group Forming" },
  { value: "confirmed_to_operate", label: "Confirmed" },
  { value: "paid", label: "Paid" },
  { value: "docs_in_progress", label: "Docs in Progress" },
  { value: "docs_complete", label: "Docs Complete" },
  { value: "closed_flown", label: "Closed - Flown" },
  { value: "closed_lost", label: "Closed - Lost" },
] as const;

/** Terminal opportunity stages */
export const TERMINAL_STAGES = new Set(["closed_flown", "closed_lost"]);

/** Cadence hints per opportunity stage — recommended follow-up intervals */
export const STAGE_CADENCE_HINTS: Record<string, { text: string; hours: number }> = {
  open: { text: "Follow up within 24 hours", hours: 24 },
  qualified: { text: "Follow up within 24 hours", hours: 24 },
  deposit_request_sent: { text: "Follow up within 48 hours", hours: 48 },
  deposit_received: { text: "Follow up within 7 days", hours: 168 },
  group_forming: { text: "Follow up within 7 days", hours: 168 },
  confirmed_to_operate: { text: "Follow up within 48 hours", hours: 48 },
  paid: { text: "Follow up within 3–5 days", hours: 96 },
  docs_in_progress: { text: "Follow up within 3–5 days", hours: 96 },
  docs_complete: { text: "Follow up within 5 days", hours: 120 },
};
