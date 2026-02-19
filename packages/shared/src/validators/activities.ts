import { z } from "zod";

export const activityTypes = [
  "email",
  "whatsapp_message",
  "online_meeting",
  "phone_call",
] as const;

export const createActivitySchema = z
  .object({
    type: z.enum(activityTypes).default("email"),
    subject: z.string().min(1).max(500),
    notes: z.string().max(10000).optional(),
    activityDate: z.string().datetime(),
    humanId: z.string().optional(),
    routeSignupId: z.string().uuid().optional(),
    gmailId: z.string().optional(),
    frontId: z.string().optional(),
  })
  .refine((data) => data.humanId || data.routeSignupId, {
    message: "At least one of humanId or routeSignupId is required",
  });

export const updateActivitySchema = z.object({
  type: z.enum(activityTypes).optional(),
  subject: z.string().min(1).max(500).optional(),
  notes: z.string().max(10000).optional(),
  activityDate: z.string().datetime().optional(),
  humanId: z.string().optional(),
  routeSignupId: z.string().uuid().optional(),
  gmailId: z.string().optional(),
  frontId: z.string().optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
