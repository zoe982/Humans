import { z } from "zod";

export const websiteBookingRequestStatuses = [
  "confirmed",
  "closed_cancelled",
  "closed_no_response",
  "closed_converted",
] as const;

export type WebsiteBookingRequestStatus = (typeof websiteBookingRequestStatuses)[number];

export const updateWebsiteBookingRequestSchema = z.object({
  crm_note: z.string().max(5000).optional(),
  status: z.enum(websiteBookingRequestStatuses).optional(),
  crm_source: z.string().max(255).nullable().optional(),
  crm_channel: z.string().max(255).nullable().optional(),
});

export type UpdateWebsiteBookingRequestInput = z.infer<typeof updateWebsiteBookingRequestSchema>;
