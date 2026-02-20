/** Status colors for humans/accounts (open/active/closed) */
export const statusColors: Record<string, string> = {
  open: "bg-[rgba(59,130,246,0.15)] text-blue-300",
  active: "bg-[rgba(34,197,94,0.15)] text-green-300",
  closed: "bg-[rgba(239,68,68,0.15)] text-red-300",
};

/** Human type badge colors */
export const humanTypeColors: Record<string, string> = {
  client: "bg-[rgba(59,130,246,0.15)] text-blue-300",
  trainer: "bg-[rgba(34,197,94,0.15)] text-green-300",
  travel_agent: "bg-[rgba(168,85,247,0.15)] text-purple-300",
  flight_broker: "bg-[rgba(249,115,22,0.15)] text-orange-300",
};

/** Activity type badge colors */
export const activityTypeColors: Record<string, string> = {
  email: "bg-[rgba(59,130,246,0.15)] text-blue-300",
  whatsapp_message: "bg-[rgba(34,197,94,0.15)] text-green-300",
  online_meeting: "bg-[rgba(168,85,247,0.15)] text-purple-300",
  phone_call: "bg-[rgba(249,115,22,0.15)] text-orange-300",
  social_message: "bg-[rgba(236,72,153,0.15)] text-pink-300",
};

/** Route signup status colors */
export const signupStatusColors: Record<string, string> = {
  open: "bg-[rgba(59,130,246,0.15)] text-blue-300",
  qualified: "bg-[rgba(234,179,8,0.15)] text-yellow-300",
  closed_converted: "bg-[rgba(34,197,94,0.15)] text-green-300",
  closed_rejected: "bg-[rgba(239,68,68,0.15)] text-red-300",
};

/** Booking request status colors */
export const bookingRequestStatusColors: Record<string, string> = {
  confirmed: "bg-[rgba(34,197,94,0.15)] text-green-300",
  closed_cancelled: "bg-[rgba(239,68,68,0.15)] text-red-300",
};

/** Deposit/balance status colors */
export const paymentStatusColors: Record<string, string> = {
  pending: "bg-[rgba(234,179,8,0.15)] text-yellow-300",
  paid: "bg-[rgba(34,197,94,0.15)] text-green-300",
  refunded: "bg-[rgba(168,85,247,0.15)] text-purple-300",
};

/** Label badge color (purple) */
export const labelBadgeColor = "bg-[rgba(168,85,247,0.15)] text-purple-300";

/** Role label badge color (orange) */
export const roleLabelBadgeColor = "bg-[rgba(249,115,22,0.15)] text-orange-300";
