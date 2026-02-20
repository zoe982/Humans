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
};

/** Activity type options for SearchableSelect */
export const ACTIVITY_TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "whatsapp_message", label: "WhatsApp" },
  { value: "online_meeting", label: "Meeting" },
  { value: "phone_call", label: "Phone Call" },
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
