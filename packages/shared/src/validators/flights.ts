import { z } from "zod";

export const createFlightSchema = z.object({
  flightNumber: z.string().min(1).max(20),
  departureAirport: z.string().min(3).max(10),
  arrivalAirport: z.string().min(3).max(10),
  departureDate: z.string().datetime(),
  arrivalDate: z.string().datetime(),
  airline: z.string().min(1).max(100),
  cabinClass: z.string().max(50).optional(),
  maxPets: z.number().int().positive(),
  status: z
    .enum(["scheduled", "confirmed", "in_transit", "completed", "cancelled"])
    .optional(),
});

export const updateFlightSchema = createFlightSchema.partial();

export type CreateFlightInput = z.infer<typeof createFlightSchema>;
export type UpdateFlightInput = z.infer<typeof updateFlightSchema>;
