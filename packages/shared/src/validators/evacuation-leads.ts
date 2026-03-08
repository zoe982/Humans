import { z } from "zod";

export const evacuationLeadStatuses = [
  "open",
  "pending_response",
  "qualified",
  "closed_lost",
  "closed_converted",
] as const;

export type EvacuationLeadStatus = (typeof evacuationLeadStatuses)[number];

export const updateEvacuationLeadStatusSchema = z.object({
  status: z.enum(evacuationLeadStatuses),
});

export const updateEvacuationLeadSchema = z.object({
  status: z.enum(evacuationLeadStatuses).optional(),
  note: z.string().max(5000).optional(),
  crm_source: z.string().max(255).nullable().optional(),
  crm_channel: z.string().max(255).nullable().optional(),
  loss_reason: z.string().max(255).nullable().optional(),
  loss_notes: z.string().max(5000).nullable().optional(),
});

export type UpdateEvacuationLeadStatusInput = z.infer<typeof updateEvacuationLeadStatusSchema>;
export type UpdateEvacuationLeadInput = z.infer<typeof updateEvacuationLeadSchema>;
