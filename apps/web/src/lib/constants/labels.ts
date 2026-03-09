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
  pending_response: "Pending Response",
  qualified: "Qualified",
  closed_lost: "Closed - Lost",
  closed_converted: "Closed - Converted",
};

/** Evacuation lead status display labels */
export const evacuationLeadStatusLabels: Record<string, string> = {
  open: "Open",
  pending_response: "Pending Response",
  qualified: "Qualified",
  closed_lost: "Closed - Lost",
  closed_converted: "Closed - Converted",
};

/** Booking request status display labels */
export const bookingRequestStatusLabels: Record<string, string> = {
  open: "Open",
  pending_response: "Pending Response",
  qualified: "Qualified",
  deposit_requested: "Deposit Requested",
  deposit_received: "Deposit Received",
  group_forming: "Group Forming",
  flight_confirmed: "Flight Confirmed",
  final_payment_requested: "Final Payment Requested",
  paid: "Paid",
  docs_in_progress: "Docs in Progress",
  docs_complete: "Docs Complete",
  closed_flown: "Closed - Flown",
  closed_lost: "Closed - Lost",
};

/** Booking request status options ordered for pipeline progression */
export const BOOKING_REQUEST_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "pending_response", label: "Pending Response" },
  { value: "qualified", label: "Qualified" },
  { value: "deposit_requested", label: "Deposit Requested" },
  { value: "deposit_received", label: "Deposit Received" },
  { value: "group_forming", label: "Group Forming" },
  { value: "flight_confirmed", label: "Flight Confirmed" },
  { value: "final_payment_requested", label: "Final Payment Requested" },
  { value: "paid", label: "Paid" },
  { value: "docs_in_progress", label: "Docs in Progress" },
  { value: "docs_complete", label: "Docs Complete" },
  { value: "closed_flown", label: "Closed - Flown" },
  { value: "closed_lost", label: "Closed - Lost" },
] as const;

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
  pending_response: "Pending Response",
  qualified: "Qualified",
  closed_lost: "Closed - Lost",
  closed_converted: "Closed - Converted",
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

/** Lead type display labels (for All Leads unified view) */
export const leadTypeLabels: Record<string, string> = {
  general_lead: "General Lead",
  route_signup: "Route Signup",
  website_booking_request: "Booking Request",
  evacuation_lead: "Evacuation Lead",
};

/** Merged status labels across all lead types */
export const allLeadStatusLabels: Record<string, string> = {
  ...signupStatusLabels,
  ...bookingRequestStatusLabels,
  ...generalLeadStatusLabels,
  ...evacuationLeadStatusLabels,
};

/** Agreement status display labels */
export const agreementStatusLabels: Record<string, string> = {
  open: "Open",
  active: "Active",
  closed_inactive: "Closed - Inactive",
};

/** Agreement status options for dropdowns */
export const AGREEMENT_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "active", label: "Active" },
  { value: "closed_inactive", label: "Closed - Inactive" },
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

/** Lead pipeline status labels (active statuses only) */
export const leadPipelineStatusLabels: Record<string, string> = {
  open: "Open",
  pending_response: "Pending Response",
  qualified: "Qualified",
};

