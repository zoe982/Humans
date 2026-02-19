import { z } from "zod";

export const createColleagueSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  middleNames: z.string().max(200).optional(),
  lastName: z.string().min(1).max(100),
  role: z.enum(["admin", "manager", "agent", "viewer"]),
});

export const updateColleagueSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  middleNames: z.string().max(200).optional().nullable(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(["admin", "manager", "agent", "viewer"]).optional(),
  isActive: z.boolean().optional(),
});

export type CreateColleagueInput = z.infer<typeof createColleagueSchema>;
export type UpdateColleagueInput = z.infer<typeof updateColleagueSchema>;
