import { z } from "zod";

export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export function listResponse<T extends z.ZodTypeAny>(
  itemSchema: T,
): z.ZodObject<{ data: z.ZodArray<T>; meta: typeof paginationMetaSchema }> {
  return z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}

export function detailResponse<T extends z.ZodTypeAny>(
  itemSchema: T,
): z.ZodObject<{ data: T }> {
  return z.object({
    data: itemSchema,
  });
}

export const successResponseSchema = z.object({
  success: z.literal(true),
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;
