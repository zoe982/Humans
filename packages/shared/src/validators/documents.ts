import { z } from "zod";

export const createDocumentSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
