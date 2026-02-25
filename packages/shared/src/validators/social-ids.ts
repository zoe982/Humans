import { z } from "zod";

export const createSocialIdSchema = z.object({
  handle: z.string().min(1).max(100).regex(/^[\w@.+\-/]+$/),
  platformId: z.string().optional(),
  humanId: z.string().optional(),
  accountId: z.string().optional(),
});

export const updateSocialIdSchema = z.object({
  handle: z.string().min(1).max(100).regex(/^[\w@.+\-/]+$/).optional(),
  platformId: z.string().nullable().optional(),
  humanId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
});

export type CreateSocialIdInput = z.infer<typeof createSocialIdSchema>;
export type UpdateSocialIdInput = z.infer<typeof updateSocialIdSchema>;
