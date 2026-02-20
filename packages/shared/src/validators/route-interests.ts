import { z } from "zod";

export const routeInterestFrequencyEnum = z.enum(["one_time", "repeat"]);

export const createRouteInterestSchema = z.object({
  originCity: z.string().min(1).max(200),
  originCountry: z.string().min(1).max(200),
  destinationCity: z.string().min(1).max(200),
  destinationCountry: z.string().min(1).max(200),
});

export const createRouteInterestExpressionSchema = z
  .object({
    humanId: z.string().min(1),
    routeInterestId: z.string().min(1).optional(),
    originCity: z.string().min(1).max(200).optional(),
    originCountry: z.string().min(1).max(200).optional(),
    destinationCity: z.string().min(1).max(200).optional(),
    destinationCountry: z.string().min(1).max(200).optional(),
    activityId: z.string().min(1).optional(),
    frequency: routeInterestFrequencyEnum.default("one_time"),
    travelYear: z.number().int().min(2020).max(2100).optional(),
    travelMonth: z.number().int().min(1).max(12).optional(),
    travelDay: z.number().int().min(1).max(31).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (d) =>
      (d.routeInterestId != null && d.routeInterestId !== "") ||
      (d.originCity != null && d.originCity !== "" &&
       d.originCountry != null && d.originCountry !== "" &&
       d.destinationCity != null && d.destinationCity !== "" &&
       d.destinationCountry != null && d.destinationCountry !== ""),
    {
      message: "Either routeInterestId or all four origin/destination city/country fields are required",
    },
  );

export const updateRouteInterestExpressionSchema = z.object({
  frequency: routeInterestFrequencyEnum.optional(),
  travelYear: z.number().int().min(2020).max(2100).nullable().optional(),
  travelMonth: z.number().int().min(1).max(12).nullable().optional(),
  travelDay: z.number().int().min(1).max(31).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  activityId: z.string().min(1).nullable().optional(),
});

export type CreateRouteInterestInput = z.infer<typeof createRouteInterestSchema>;
export type CreateRouteInterestExpressionInput = z.infer<typeof createRouteInterestExpressionSchema>;
export type UpdateRouteInterestExpressionInput = z.infer<typeof updateRouteInterestExpressionSchema>;
