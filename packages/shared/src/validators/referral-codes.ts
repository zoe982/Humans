import { z } from "zod";

export const createReferralCodeSchema = z.object({
  code: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  humanId: z.string().optional(),
  accountId: z.string().optional(),
});

export const updateReferralCodeSchema = z.object({
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
  humanId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
});

export type CreateReferralCodeInput = z.infer<typeof createReferralCodeSchema>;
export type UpdateReferralCodeInput = z.infer<typeof updateReferralCodeSchema>;
