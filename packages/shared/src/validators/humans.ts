import { z } from "zod";

const emailEntrySchema = z.object({
  email: z.string().email().max(255),
  labelId: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const humanTypeIdSchema = z.string().min(1);

export const humanStatusEnum = z.enum(["open", "active", "closed"]);

export const createHumanSchema = z.object({
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100),
  emails: z.array(emailEntrySchema).max(20).default([]),
  types: z.array(z.string().min(1)).min(1).max(10),
  status: humanStatusEnum.default("open"),
});

export const updateHumanSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1).max(100).optional(),
  emails: z.array(emailEntrySchema).max(20).optional(),
  types: z.array(z.string().min(1)).min(1).optional(),
  status: humanStatusEnum.optional(),
});

export const updateHumanStatusSchema = z.object({
  status: humanStatusEnum,
});

export const linkRouteSignupSchema = z.object({
  routeSignupId: z.string().uuid(),
});

export const linkWebsiteBookingRequestSchema = z.object({
  websiteBookingRequestId: z.string().uuid(),
});

export const createHumanRelationshipSchema = z.object({
  humanId2: z.string().min(1),
  labelId: z.string().optional(),
});

export const updateHumanRelationshipSchema = z.object({
  labelId: z.string().nullish(),
});

export type CreateHumanInput = z.infer<typeof createHumanSchema>;
export type UpdateHumanInput = z.infer<typeof updateHumanSchema>;
export type UpdateHumanStatusInput = z.infer<typeof updateHumanStatusSchema>;
export type CreateHumanRelationshipInput = z.infer<typeof createHumanRelationshipSchema>;
export type UpdateHumanRelationshipInput = z.infer<typeof updateHumanRelationshipSchema>;
