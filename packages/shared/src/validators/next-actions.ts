import { z } from "zod";

export const updateEntityNextActionSchema = z.object({
  ownerId: z.string().min(1),
  description: z.string().min(1).max(1000),
  type: z.enum(["email", "whatsapp_message", "online_meeting", "phone_call", "social_message"]),
  dueDate: z.string().min(1),
  cadenceNote: z.string().max(280).optional().nullable(),
});

export type UpdateEntityNextActionInput = z.infer<typeof updateEntityNextActionSchema>;
