import { z } from "zod";

export const generalLeadStatuses = [
  "open",
  "qualified",
  "closed_converted",
  "closed_rejected",
  "closed_no_response",
] as const;

export type GeneralLeadStatus = (typeof generalLeadStatuses)[number];

export const createGeneralLeadSchema = z.object({
  firstName: z.string().min(1).max(255),
  middleName: z.string().max(255).optional(),
  lastName: z.string().min(1).max(255),
  notes: z.string().max(10000).optional(),
  ownerId: z.string().optional(),
});

export const updateGeneralLeadSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  middleName: z.string().max(255).nullable().optional(),
  lastName: z.string().min(1).max(255).optional(),
  notes: z.string().max(10000).optional(),
  ownerId: z.string().nullable().optional(),
  source: z.string().max(255).nullable().optional(),
  channel: z.string().max(255).nullable().optional(),
});

export const updateGeneralLeadStatusSchema = z
  .object({
    status: z.enum(generalLeadStatuses),
    rejectReason: z.string().max(5000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "closed_rejected" && (data.rejectReason == null || data.rejectReason.trim() === "")) {
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

export const importFromFrontSchema = z.object({
  frontId: z.string().min(1).max(100),
});

export type CreateGeneralLeadInput = z.infer<typeof createGeneralLeadSchema>;
export type UpdateGeneralLeadInput = z.infer<typeof updateGeneralLeadSchema>;
export type UpdateGeneralLeadStatusInput = z.infer<typeof updateGeneralLeadStatusSchema>;
export type ConvertGeneralLeadInput = z.infer<typeof convertGeneralLeadSchema>;
export type ImportFromFrontInput = z.infer<typeof importFromFrontSchema>;
