import type { z } from "zod";

interface ValidateContext {
  url: string;
  schemaName: string;
  strict: boolean;
}

export function validateResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: ValidateContext,
): z.infer<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-type-assertion -- z.infer<T> is inherently unresolvable in generic context
    return result.data as z.infer<T>;
  }

  if (context.strict) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Response validation failed for ${context.schemaName} at ${context.url}:\n${issues}`,
    );
  }

  const issues = result.error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join(", ");
  console.warn(
    `Response validation warning for ${context.schemaName} at ${context.url}: ${issues}`,
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- z.infer<T> is inherently unresolvable in generic context
  return data as z.infer<T>;
}
