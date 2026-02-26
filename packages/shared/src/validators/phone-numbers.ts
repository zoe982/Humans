import { z } from "zod";

export const createPhoneNumberSchema = z.object({
  humanId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  generalLeadId: z.string().min(1).optional(),
  websiteBookingRequestId: z.string().min(1).optional(),
  routeSignupId: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).max(50).regex(/^[\d+\-() .]+$/),
  labelId: z.string().nullable().optional(),
  hasWhatsapp: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
}).refine(
  (data) => data.humanId != null || data.accountId != null || data.generalLeadId != null || data.websiteBookingRequestId != null || data.routeSignupId != null,
  { message: "At least one entity ID is required" },
);

export const updatePhoneNumberSchema = z.object({
  phoneNumber: z.string().min(1).max(50).regex(/^[\d+\-() .]+$/).optional(),
  labelId: z.string().nullable().optional(),
  hasWhatsapp: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  humanId: z.string().min(1).nullable().optional(),
  accountId: z.string().min(1).nullable().optional(),
  generalLeadId: z.string().min(1).nullable().optional(),
  websiteBookingRequestId: z.string().min(1).nullable().optional(),
  routeSignupId: z.string().min(1).nullable().optional(),
});

export type CreatePhoneNumberInput = z.infer<typeof createPhoneNumberSchema>;
export type UpdatePhoneNumberInput = z.infer<typeof updatePhoneNumberSchema>;
