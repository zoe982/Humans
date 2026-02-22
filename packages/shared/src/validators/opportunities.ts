import { z } from "zod";

export const opportunityStageEnum = z.enum([
  "open",
  "qualified",
  "deposit_request_sent",
  "deposit_received",
  "group_forming",
  "confirmed_to_operate",
  "paid",
  "docs_in_progress",
  "docs_complete",
  "closed_flown",
  "closed_lost",
]);

export const createOpportunitySchema = z
  .object({
    stage: opportunityStageEnum.default("open"),
    seatsRequested: z.number().int().min(1).default(1),
    passengerSeats: z.number().int().min(0).default(1),
    petSeats: z.number().int().min(0).default(0),
    lossReason: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.stage === "closed_lost" && (data.lossReason == null || data.lossReason.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lossReason"],
        message: "Loss reason is required when stage is closed_lost",
      });
    }
  });

export const updateOpportunitySchema = z.object({
  seatsRequested: z.number().int().min(1).optional(),
  passengerSeats: z.number().int().min(0).optional(),
  petSeats: z.number().int().min(0).optional(),
  notes: z.string().max(10000).optional().nullable(),
  lossReason: z.string().max(2000).optional().nullable(),
});

export const updateOpportunityStageSchema = z
  .object({
    stage: opportunityStageEnum,
    lossReason: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.stage === "closed_lost" && (data.lossReason == null || data.lossReason.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lossReason"],
        message: "Loss reason is required when stage is closed_lost",
      });
    }
  });

export const updateNextActionSchema = z.object({
  ownerId: z.string().min(1),
  description: z.string().min(1).max(1000),
  type: z.enum(["email", "whatsapp_message", "online_meeting", "phone_call", "social_message"]),
  startDate: z.string().optional(),
  dueDate: z.string().min(1),
});

export const linkOpportunityHumanSchema = z.object({
  humanId: z.string().min(1),
  roleId: z.string().min(1).optional(),
});

export const updateOpportunityHumanSchema = z.object({
  roleId: z.string().min(1),
});

export const linkOpportunityPetSchema = z.object({
  petId: z.string().min(1),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type UpdateOpportunityStageInput = z.infer<typeof updateOpportunityStageSchema>;
export type UpdateNextActionInput = z.infer<typeof updateNextActionSchema>;
export type LinkOpportunityHumanInput = z.infer<typeof linkOpportunityHumanSchema>;
export type UpdateOpportunityHumanInput = z.infer<typeof updateOpportunityHumanSchema>;
export type LinkOpportunityPetInput = z.infer<typeof linkOpportunityPetSchema>;
