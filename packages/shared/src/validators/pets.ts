import { z } from "zod";
import { PET_BREEDS, PET_TYPES } from "../constants";

export const petBreedSchema = z.enum(PET_BREEDS);
export const petTypeSchema = z.enum(PET_TYPES);

export const createPetSchema = z.object({
  humanId: z.string().min(1),
  type: petTypeSchema.default("dog"),
  name: z.string().min(1).max(100),
  breed: petBreedSchema.nullable().optional(),
  weight: z.number().positive().nullable().optional(),
}).refine(
  (data) => data.type !== "cat" || !data.breed,
  { message: "Cats should not have a breed", path: ["breed"] },
);

export const updatePetSchema = z.object({
  humanId: z.string().min(1).optional(),
  type: petTypeSchema.optional(),
  name: z.string().min(1).max(100).optional(),
  breed: petBreedSchema.nullable().optional(),
  weight: z.number().positive().nullable().optional(),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
