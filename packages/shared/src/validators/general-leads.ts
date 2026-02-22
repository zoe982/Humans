import { z } from "zod";

export const generalLeadStatuses = [
  "open",
  "qualified",
  "closed_converted",
  "closed_rejected",
] as const;

export type GeneralLeadStatus = (typeof generalLeadStatuses)[number];

export const generalLeadSources = [
  "whatsapp",
  "email",
  "direct_referral",
] as const;

export type GeneralLeadSource = (typeof generalLeadSources)[number];

export const createGeneralLeadSchema = z.object({
  source: z.enum(generalLeadSources),
  notes: z.string().max(10000).optional(),
  ownerId: z.string().optional(),
});

export const updateGeneralLeadSchema = z.object({
  notes: z.string().max(10000).optional(),
  ownerId: z.string().nullable().optional(),
});

export const updateGeneralLeadStatusSchema = z
  .object({
    status: z.enum(generalLeadStatuses),
    rejectReason: z.string().max(5000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "closed_rejected" && (!data.rejectReason || data.rejectReason.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectReason"],
        message: "Reject reason is required when closing as rejected",
      });
    }
  });

export const convertGeneralLeadSchema = z.object({
  humanId: z.string(),
});

export type CreateGeneralLeadInput = z.infer<typeof createGeneralLeadSchema>;
export type UpdateGeneralLeadInput = z.infer<typeof updateGeneralLeadSchema>;
export type UpdateGeneralLeadStatusInput = z.infer<typeof updateGeneralLeadStatusSchema>;
export type ConvertGeneralLeadInput = z.infer<typeof convertGeneralLeadSchema>;
