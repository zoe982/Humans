import { z } from "zod";

export const websiteBookingRequestStatuses = [
  "open",
  "pending_response",
  "qualified",
  "deposit_requested",
  "deposit_received",
  "group_forming",
  "flight_confirmed",
  "final_payment_requested",
  "paid",
  "docs_in_progress",
  "docs_complete",
  "closed_flown",
  "closed_lost",
] as const;

export type WebsiteBookingRequestStatus = (typeof websiteBookingRequestStatuses)[number];

export const updateWebsiteBookingRequestSchema = z.object({
  crm_note: z.string().max(5000).optional(),
  status: z.enum(websiteBookingRequestStatuses).optional(),
  crm_source: z.string().max(255).nullable().optional(),
  crm_channel: z.string().max(255).nullable().optional(),
  crm_loss_reason: z.string().max(255).nullable().optional(),
  crm_loss_notes: z.string().max(5000).nullable().optional(),
});

export type UpdateWebsiteBookingRequestInput = z.infer<typeof updateWebsiteBookingRequestSchema>;
