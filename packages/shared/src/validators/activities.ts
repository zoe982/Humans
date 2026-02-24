import { z } from "zod";

export const activityTypes = [
  "email",
  "whatsapp_message",
  "online_meeting",
  "phone_call",
  "social_message",
] as const;

export const createActivitySchema = z
  .object({
    type: z.enum(activityTypes).default("email"),
    subject: z.string().max(500).optional(),
    notes: z.string().max(10000).optional(),
    activityDate: z.string().datetime(),
    humanId: z.string().optional(),
    accountId: z.string().optional(),
    routeSignupId: z.string().uuid().optional(),
    websiteBookingRequestId: z.string().uuid().optional(),
    generalLeadId: z.string().optional(),
    opportunityId: z.string().optional(),
    gmailId: z.string().optional(),
    frontId: z.string().optional(),
    frontConversationId: z.string().optional(),
    direction: z.enum(["inbound", "outbound"]).optional(),
    syncRunId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "email" && (data.subject == null || data.subject.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subject"],
        message: "Subject is required for email activities",
      });
    }
    if (data.humanId == null && data.routeSignupId == null && data.accountId == null && data.websiteBookingRequestId == null && data.generalLeadId == null && data.opportunityId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["humanId"],
        message: "At least one of humanId, accountId, routeSignupId, websiteBookingRequestId, generalLeadId, or opportunityId is required",
      });
    }
  });

export const updateActivitySchema = z.object({
  type: z.enum(activityTypes).optional(),
  subject: z.string().min(1).max(500).optional(),
  notes: z.string().max(10000).nullish(),
  activityDate: z.string().datetime().optional(),
  humanId: z.string().nullish(),
  accountId: z.string().nullish(),
  routeSignupId: z.string().uuid().nullish(),
  websiteBookingRequestId: z.string().uuid().nullish(),
  generalLeadId: z.string().nullish(),
  opportunityId: z.string().nullish(),
  gmailId: z.string().optional(),
  frontId: z.string().optional(),
  frontConversationId: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]).nullish(),
  syncRunId: z.string().optional(),
  ownerId: z.string().nullish(),
});

export const linkActivityOpportunitySchema = z.object({
  opportunityId: z.string().min(1),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type LinkActivityOpportunityInput = z.infer<typeof linkActivityOpportunitySchema>;
