import { z } from "zod";

export const emailResponseSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  humanId: z.string().nullable(),
  accountId: z.string().nullable(),
  generalLeadId: z.string().nullable(),
  websiteBookingRequestId: z.string().nullable(),
  routeSignupId: z.string().nullable(),
  email: z.string(),
  labelId: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
}).passthrough();

export type EmailResponse = z.infer<typeof emailResponseSchema>;

export const phoneNumberResponseSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  humanId: z.string().nullable(),
  accountId: z.string().nullable(),
  generalLeadId: z.string().nullable(),
  websiteBookingRequestId: z.string().nullable(),
  routeSignupId: z.string().nullable(),
  phoneNumber: z.string(),
  labelId: z.string().nullable(),
  hasWhatsapp: z.boolean(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
}).passthrough();

export type PhoneNumberResponse = z.infer<typeof phoneNumberResponseSchema>;

export const humanListItemSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  emails: z.array(emailResponseSchema),
  types: z.array(z.string()),
}).passthrough();

export type HumanListItem = z.infer<typeof humanListItemSchema>;

export const humanDetailSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  emails: z.array(emailResponseSchema),
  types: z.array(z.string()),
  phoneNumbers: z.array(phoneNumberResponseSchema),
  pets: z.array(z.object({
    id: z.string(),
    displayId: z.string(),
    name: z.string().nullable(),
    type: z.string(),
    humanId: z.string().nullable(),
    createdAt: z.string(),
  }).passthrough()),
  linkedRouteSignups: z.array(z.object({
    id: z.string(),
    humanId: z.string().nullable(),
    routeSignupId: z.string(),
    linkedAt: z.string(),
  }).passthrough()),
  linkedWebsiteBookingRequests: z.array(z.object({
    id: z.string(),
    humanId: z.string().nullable(),
    websiteBookingRequestId: z.string(),
    linkedAt: z.string(),
  }).passthrough()),
  geoInterestExpressions: z.array(z.object({
    id: z.string(),
    humanId: z.string().nullable(),
    geoInterestId: z.string(),
    activityId: z.string().nullable(),
    createdAt: z.string(),
    city: z.string().nullable(),
    country: z.string().nullable(),
  }).passthrough()),
  routeInterestExpressions: z.array(z.object({
    id: z.string(),
    humanId: z.string().nullable(),
    routeInterestId: z.string(),
    activityId: z.string().nullable(),
    createdAt: z.string(),
    originCity: z.string().nullable(),
    originCountry: z.string().nullable(),
    destinationCity: z.string().nullable(),
    destinationCountry: z.string().nullable(),
  }).passthrough()),
  linkedAccounts: z.array(z.object({
    id: z.string(),
    accountId: z.string(),
    humanId: z.string(),
    labelId: z.string().nullable(),
    labelName: z.string().nullable(),
    accountName: z.string(),
  }).passthrough()),
  socialIds: z.array(z.object({
    id: z.string(),
    displayId: z.string(),
    handle: z.string(),
    platformId: z.string().nullable(),
    humanId: z.string().nullable(),
    accountId: z.string().nullable(),
    createdAt: z.string(),
  }).passthrough()),
  websites: z.array(z.object({
    id: z.string(),
    displayId: z.string(),
    url: z.string(),
    humanId: z.string().nullable(),
    accountId: z.string().nullable(),
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

export type HumanDetail = z.infer<typeof humanDetailSchema>;
