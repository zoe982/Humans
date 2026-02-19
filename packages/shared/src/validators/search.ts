import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
