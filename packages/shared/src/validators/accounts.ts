import { z } from "zod";

export const accountStatusEnum = z.enum(["open", "active", "closed"]);

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  status: accountStatusEnum.default("open"),
  typeIds: z.array(z.string()).optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  typeIds: z.array(z.string()).optional(),
});

export const updateAccountStatusSchema = z.object({
  status: accountStatusEnum,
});

export const createAccountEmailSchema = z.object({
  email: z.string().email().max(255),
  labelId: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const updateAccountEmailSchema = createAccountEmailSchema.partial();

export const createAccountPhoneNumberSchema = z.object({
  phoneNumber: z.string().min(1).max(50),
  labelId: z.string().optional(),
  hasWhatsapp: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
});

export const updateAccountPhoneNumberSchema = createAccountPhoneNumberSchema.partial();

export const linkAccountHumanSchema = z.object({
  humanId: z.string().min(1),
  labelId: z.string().optional(),
});

export const updateAccountHumanSchema = z.object({
  labelId: z.string().optional().nullable(),
});

export const createConfigItemSchema = z.object({
  name: z.string().min(1).max(255),
});

export const updateConfigItemSchema = z.object({
  name: z.string().min(1).max(255),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type UpdateAccountStatusInput = z.infer<typeof updateAccountStatusSchema>;
export type CreateAccountEmailInput = z.infer<typeof createAccountEmailSchema>;
export type CreateAccountPhoneNumberInput = z.infer<typeof createAccountPhoneNumberSchema>;
export type LinkAccountHumanInput = z.infer<typeof linkAccountHumanSchema>;
export type UpdateAccountHumanInput = z.infer<typeof updateAccountHumanSchema>;
export type CreateConfigItemInput = z.infer<typeof createConfigItemSchema>;
