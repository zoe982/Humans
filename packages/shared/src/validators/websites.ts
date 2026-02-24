import { z } from "zod";

export const createWebsiteSchema = z.object({
  url: z.string().url(),
  humanId: z.string().optional(),
  accountId: z.string().optional(),
});

export const updateWebsiteSchema = z.object({
  url: z.string().url().optional(),
  humanId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
});

export type CreateWebsiteInput = z.infer<typeof createWebsiteSchema>;
export type UpdateWebsiteInput = z.infer<typeof updateWebsiteSchema>;
