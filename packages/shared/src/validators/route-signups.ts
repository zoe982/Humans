import { z } from "zod";

export const routeSignupStatuses = [
  "open",
  "pending_response",
  "closed_lost",
  "closed_converted",
] as const;

export type RouteSignupStatus = (typeof routeSignupStatuses)[number];

export const updateRouteSignupStatusSchema = z.object({
  status: z.enum(routeSignupStatuses),
});

export const updateRouteSignupSchema = z.object({
  status: z.enum(routeSignupStatuses).optional(),
  note: z.string().max(5000).optional(),
  crm_source: z.string().max(255).nullable().optional(),
  crm_channel: z.string().max(255).nullable().optional(),
  loss_reason: z.string().max(255).nullable().optional(),
  loss_notes: z.string().max(5000).nullable().optional(),
});

export type UpdateRouteSignupStatusInput = z.infer<typeof updateRouteSignupStatusSchema>;
export type UpdateRouteSignupInput = z.infer<typeof updateRouteSignupSchema>;
