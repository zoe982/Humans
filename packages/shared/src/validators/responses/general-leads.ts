import { z } from "zod";

export const generalLeadListItemSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  status: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  notes: z.string().nullable(),
  rejectReason: z.string().nullable(),
  lossReason: z.string().nullable(),
  lossNotes: z.string().nullable(),
  convertedHumanId: z.string().nullable(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ownerName: z.string().nullable(),
  convertedHumanDisplayId: z.string().nullable(),
  convertedHumanName: z.string().nullable(),
}).passthrough();

export type GeneralLeadListItem = z.infer<typeof generalLeadListItemSchema>;

export const generalLeadDetailSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  status: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  notes: z.string().nullable(),
  rejectReason: z.string().nullable(),
  lossReason: z.string().nullable(),
  lossNotes: z.string().nullable(),
  convertedHumanId: z.string().nullable(),
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ownerName: z.string().nullable(),
  convertedHumanDisplayId: z.string().nullable(),
  convertedHumanName: z.string().nullable(),
  activities: z.array(z.unknown()),
  emails: z.array(z.unknown()),
  phoneNumbers: z.array(z.unknown()),
}).passthrough();

export type GeneralLeadDetail = z.infer<typeof generalLeadDetailSchema>;
