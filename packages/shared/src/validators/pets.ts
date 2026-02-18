import { z } from "zod";

export const createPetSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1).max(100),
  breed: z.string().max(100).optional(),
  weight: z.number().positive().optional(),
  age: z.number().int().nonnegative().optional(),
  specialNeeds: z.string().max(2000).optional(),
});

export const updatePetSchema = createPetSchema.omit({ clientId: true }).partial();

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
