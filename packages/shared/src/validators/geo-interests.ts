import { z } from "zod";

export const createGeoInterestSchema = z.object({
  city: z.string().min(1).max(200),
  country: z.string().min(1).max(200),
});

export const createGeoInterestExpressionSchema = z
  .object({
    humanId: z.string().min(1),
    geoInterestId: z.string().min(1).optional(),
    city: z.string().min(1).max(200).optional(),
    country: z.string().min(1).max(200).optional(),
    activityId: z.string().min(1).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => (d.geoInterestId != null && d.geoInterestId !== "") || (d.city != null && d.city !== "" && d.country != null && d.country !== ""), {
    message: "Either geoInterestId or both city and country are required",
  });

export const updateGeoInterestExpressionSchema = z.object({
  notes: z.string().max(2000).nullable(),
});

export type CreateGeoInterestInput = z.infer<typeof createGeoInterestSchema>;
export type CreateGeoInterestExpressionInput = z.infer<typeof createGeoInterestExpressionSchema>;
export type UpdateGeoInterestExpressionInput = z.infer<typeof updateGeoInterestExpressionSchema>;
