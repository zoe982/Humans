import { z } from "zod";

export const updateCadenceConfigSchema = z.object({
  cadenceHours: z.number().int().min(1),
  displayText: z.string().min(1).max(500),
});

export type UpdateCadenceConfigInput = z.infer<typeof updateCadenceConfigSchema>;
