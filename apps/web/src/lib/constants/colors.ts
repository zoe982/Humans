/** Status colors for humans/accounts (open/active/closed) */
export const statusColors: Record<string, string> = {
  open: "badge-blue",
  active: "badge-green",
  closed: "badge-red",
};

/** Human type badge colors */
export const humanTypeColors: Record<string, string> = {
  client: "badge-blue",
  trainer: "badge-green",
  travel_agent: "badge-purple",
  flight_broker: "badge-orange",
};

/** Activity type badge colors */
export const activityTypeColors: Record<string, string> = {
  email: "badge-blue",
  whatsapp_message: "badge-green",
  online_meeting: "badge-purple",
  phone_call: "badge-orange",
  social_message: "badge-pink",
};

/** Route signup status colors */
export const signupStatusColors: Record<string, string> = {
  open: "badge-blue",
  qualified: "badge-yellow",
  closed_converted: "badge-green",
  closed_rejected: "badge-red",
};

/** Booking request status colors */
export const bookingRequestStatusColors: Record<string, string> = {
  confirmed: "badge-green",
  closed_cancelled: "badge-red",
};

/** Deposit/balance status colors */
export const paymentStatusColors: Record<string, string> = {
  pending: "badge-yellow",
  paid: "badge-green",
  refunded: "badge-purple",
};

/** Label badge color (purple) */
export const labelBadgeColor = "badge-purple";

/** Role label badge color (orange) */
export const roleLabelBadgeColor = "badge-orange";
