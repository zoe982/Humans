import { z } from "zod";

export const agreementStatusEnum = z.enum(["open", "active", "closed_inactive"]);

export const createAgreementSchema = z
  .object({
    title: z.string().min(1).max(500),
    typeId: z.string().min(1).optional(),
    status: agreementStatusEnum.default("open"),
    activationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
      .optional()
      .nullable(),
    notes: z.string().max(10000).optional().nullable(),
    humanId: z.string().min(1).optional().nullable(),
    accountId: z.string().min(1).optional().nullable(),
  })
  .refine(
    (data) => (data.humanId != null && data.humanId !== "") || (data.accountId != null && data.accountId !== ""),
    { message: "At least one of humanId or accountId is required", path: ["humanId"] },
  );

export const updateAgreementSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  typeId: z.string().min(1).optional().nullable(),
  status: agreementStatusEnum.optional(),
  activationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
    .optional()
    .nullable(),
  notes: z.string().max(10000).optional().nullable(),
  humanId: z.string().min(1).optional().nullable(),
  accountId: z.string().min(1).optional().nullable(),
});

export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
export type UpdateAgreementInput = z.infer<typeof updateAgreementSchema>;
