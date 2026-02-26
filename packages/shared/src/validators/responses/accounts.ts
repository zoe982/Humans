import { z } from "zod";

const accountTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough();

export const accountListItemSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  name: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  types: z.array(accountTypeSchema),
}).passthrough();

export type AccountListItem = z.infer<typeof accountListItemSchema>;

export const accountDetailSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  name: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  types: z.array(accountTypeSchema),
  linkedHumans: z.array(z.object({
    id: z.string(),
    accountId: z.string(),
    humanId: z.string(),
    labelId: z.string().nullable(),
    labelName: z.string().nullable(),
    createdAt: z.string(),
    humanDisplayId: z.string().nullable(),
    humanName: z.string(),
    humanStatus: z.string().nullable(),
    emails: z.array(z.unknown()),
    phoneNumbers: z.array(z.unknown()),
  }).passthrough()),
  emails: z.array(z.object({
    id: z.string(),
    displayId: z.string(),
    email: z.string(),
    labelId: z.string().nullable(),
    isPrimary: z.boolean(),
    createdAt: z.string(),
  }).passthrough()),
  phoneNumbers: z.array(z.object({
    id: z.string(),
    displayId: z.string(),
    phoneNumber: z.string(),
    labelId: z.string().nullable(),
    hasWhatsapp: z.boolean(),
    isPrimary: z.boolean(),
    createdAt: z.string(),
  }).passthrough()),
  activities: z.array(z.unknown()),
  socialIds: z.array(z.object({
    id: z.string(),
    displayId: z.string(),
    handle: z.string(),
    platformId: z.string().nullable(),
    createdAt: z.string(),
  }).passthrough()),
  websites: z.array(z.object({
    id: z.string(),
    displayId: z.string(),
    url: z.string(),
    createdAt: z.string(),
  }).passthrough()),
  referralCodes: z.array(z.object({
    id: z.string(),
    displayId: z.string(),
    code: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
  }).passthrough()),
  discountCodes: z.array(z.object({
    id: z.string(),
    crmDisplayId: z.string().nullable(),
    code: z.string(),
    description: z.string().nullable(),
    percentOff: z.number(),
    isActive: z.boolean(),
  }).passthrough()),
}).passthrough();

export type AccountDetail = z.infer<typeof accountDetailSchema>;
