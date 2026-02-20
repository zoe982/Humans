import { z } from "zod";

export const createPhoneNumberSchema = z.object({
  humanId: z.string().min(1),
  phoneNumber: z.string().min(1).max(50),
  labelId: z.string().optional(),
  hasWhatsapp: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
});

export const updatePhoneNumberSchema = createPhoneNumberSchema
  .omit({ humanId: true })
  .partial()
  .extend({
    ownerType: z.enum(["human", "account"]).optional(),
    ownerId: z.string().min(1).optional(),
  });

export type CreatePhoneNumberInput = z.infer<typeof createPhoneNumberSchema>;
export type UpdatePhoneNumberInput = z.infer<typeof updatePhoneNumberSchema>;
