import { z } from "zod";

export const websiteBookingRequestStatuses = [
  "confirmed",
  "closed_cancelled",
] as const;

export type WebsiteBookingRequestStatus = (typeof websiteBookingRequestStatuses)[number];

export const updateWebsiteBookingRequestSchema = z.object({
  crm_note: z.string().max(5000).optional(),
});

export type UpdateWebsiteBookingRequestInput = z.infer<typeof updateWebsiteBookingRequestSchema>;
