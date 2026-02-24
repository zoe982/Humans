import { z } from "zod";

export const updateDiscountCodeSchema = z.object({
  humanId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
});

export type UpdateDiscountCodeInput = z.infer<typeof updateDiscountCodeSchema>;
