import { z } from "zod";

export const createEmailSchema = z.object({
  humanId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  generalLeadId: z.string().min(1).optional(),
  websiteBookingRequestId: z.string().min(1).optional(),
  routeSignupId: z.string().min(1).optional(),
  email: z.string().email().max(255),
  labelId: z.string().nullable().optional(),
  isPrimary: z.boolean().default(false),
}).refine(
  (data) => data.humanId != null || data.accountId != null || data.generalLeadId != null || data.websiteBookingRequestId != null || data.routeSignupId != null,
  { message: "At least one entity ID is required" },
);

export const updateEmailSchema = z.object({
  email: z.string().email().max(255).optional(),
  labelId: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  humanId: z.string().min(1).nullable().optional(),
  accountId: z.string().min(1).nullable().optional(),
  generalLeadId: z.string().min(1).nullable().optional(),
  websiteBookingRequestId: z.string().min(1).nullable().optional(),
  routeSignupId: z.string().min(1).nullable().optional(),
});

export type CreateEmailInput = z.infer<typeof createEmailSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
