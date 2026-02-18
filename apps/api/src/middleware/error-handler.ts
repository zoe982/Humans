import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { AppContext } from "../types";

export const errorHandler: ErrorHandler<AppContext> = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: "Validation failed",
        details: err.flatten().fieldErrors,
      },
      400,
    );
  }

  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
};
