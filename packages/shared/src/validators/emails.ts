import { z } from "zod";

export const createEmailSchema = z.object({
  humanId: z.string().min(1),
  email: z.string().email().max(255),
  labelId: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const updateEmailSchema = createEmailSchema
  .omit({ humanId: true })
  .partial()
  .extend({
    ownerType: z.enum(["human", "account"]).optional(),
    ownerId: z.string().min(1).optional(),
  });

export type CreateEmailInput = z.infer<typeof createEmailSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
