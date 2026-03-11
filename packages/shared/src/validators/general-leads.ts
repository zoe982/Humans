import { z } from "zod";

export const generalLeadStatuses = [
  "open",
  "pending_response",
  "closed_lost",
  "closed_converted",
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
  lossNotes: z.string().max(10000).nullable().optional(),
});

export const updateGeneralLeadStatusSchema = z
  .object({
    status: z.enum(generalLeadStatuses),
    lossReason: z.string().max(255).optional(),
    lossNotes: z.string().max(10000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "closed_lost" && (data.lossReason == null || data.lossReason.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lossReason"],
        message: "Loss reason is required when closing as lost",
      });
    }
  });

export const convertGeneralLeadSchema = z.object({
  humanId: z.string(),
});

export const linkHumanSchema = z.object({
  humanId: z.string().min(1),
});

export const importFromFrontSchema = z.object({
  frontId: z.string().min(1).max(100),
});

export type CreateGeneralLeadInput = z.infer<typeof createGeneralLeadSchema>;
export type UpdateGeneralLeadInput = z.infer<typeof updateGeneralLeadSchema>;
export type UpdateGeneralLeadStatusInput = z.infer<typeof updateGeneralLeadStatusSchema>;
export type ConvertGeneralLeadInput = z.infer<typeof convertGeneralLeadSchema>;
export type ImportFromFrontInput = z.infer<typeof importFromFrontSchema>;
