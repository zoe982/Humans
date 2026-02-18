import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { flights } from "./flights";
import { clients } from "./clients";
import { pets } from "./pets";

export const bookingStatuses = [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const flightBookings = sqliteTable("flight_bookings", {
  id: text("id").primaryKey(),
  flightId: text("flight_id")
    .notNull()
    .references(() => flights.id),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  petId: text("pet_id")
    .notNull()
    .references(() => pets.id),
  bookingStatus: text("booking_status", { enum: bookingStatuses })
    .notNull()
    .default("pending"),
  price: integer("price").notNull(),
  confirmationR2Key: text("confirmation_r2_key"),
  specialInstructions: text("special_instructions"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
