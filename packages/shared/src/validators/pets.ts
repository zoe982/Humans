import { z } from "zod";
import { PET_BREEDS } from "../constants";

export const petBreedSchema = z.enum(PET_BREEDS);

export const createPetSchema = z.object({
  humanId: z.string().min(1),
  name: z.string().min(1).max(100),
  breed: petBreedSchema.optional(),
  weight: z.number().positive().optional(),
});

export const updatePetSchema = createPetSchema.omit({ humanId: true }).partial();

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
