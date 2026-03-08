import { z } from "zod";

export const leadScoreParentTypes = [
  "general_lead",
  "website_booking_request",
  "route_signup",
  "evacuation_lead",
] as const;
export type LeadScoreParentType = (typeof leadScoreParentTypes)[number];

export type LeadScoreBand = "hot" | "warm" | "cold";

export function getLeadScoreBand(total: number): LeadScoreBand {
  if (total >= 75) return "hot";
  if (total >= 50) return "warm";
  return "cold";
}

export const updateLeadScoreFlagsSchema = z
  .object({
    // Fit
    fitMatchesCurrentWebsiteFlight: z.boolean().optional(),
    fitPriceAcknowledgedOk: z.boolean().optional(),
    // Intent
    intentDepositPaid: z.boolean().optional(),
    intentPaymentDetailsSent: z.boolean().optional(),
    intentRequestedPaymentDetails: z.boolean().optional(),
    intentBookingSubmitted: z.boolean().optional(),
    intentBookingStarted: z.boolean().optional(),
    intentRouteSignupSubmitted: z.boolean().optional(),
    // Engagement
    engagementRespondedFast: z.boolean().optional(),
    engagementRespondedSlow: z.boolean().optional(),
    // Negative
    negativeNoContactMethod: z.boolean().optional(),
    negativeOffNetworkRequest: z.boolean().optional(),
    negativePriceObjection: z.boolean().optional(),
    negativeGhostedAfterPaymentSent: z.boolean().optional(),
    // Lifecycle
    customerHasFlown: z.boolean().optional(),
  })
  .strict();

export type UpdateLeadScoreFlagsInput = z.infer<typeof updateLeadScoreFlagsSchema>;

export const ensureLeadScoreSchema = z.object({
  parentType: z.enum(leadScoreParentTypes),
  parentId: z.string().min(1),
});

export type EnsureLeadScoreInput = z.infer<typeof ensureLeadScoreSchema>;
