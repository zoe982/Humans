import { z } from "zod";

export const createLeadSourceSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["paid", "organic", "referral", "direct", "event"]),
});

export const createLeadEventSchema = z.object({
  clientId: z.string().min(1),
  eventType: z.enum([
    "inquiry",
    "quote_requested",
    "quote_sent",
    "follow_up",
    "booking",
    "conversion",
    "lost",
  ]),
  notes: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateLeadSourceInput = z.infer<typeof createLeadSourceSchema>;
export type CreateLeadEventInput = z.infer<typeof createLeadEventSchema>;
