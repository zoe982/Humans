import { z } from "zod";

export const createBookingSchema = z.object({
  flightId: z.string().min(1),
  clientId: z.string().min(1),
  petId: z.string().min(1),
  price: z.number().int().nonnegative(),
  specialInstructions: z.string().max(2000).optional(),
});

export const updateBookingSchema = z.object({
  bookingStatus: z
    .enum(["pending", "confirmed", "checked_in", "completed", "cancelled"])
    .optional(),
  price: z.number().int().nonnegative().optional(),
  specialInstructions: z.string().max(2000).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
