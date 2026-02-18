import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const flightStatuses = [
  "scheduled",
  "confirmed",
  "in_transit",
  "completed",
  "cancelled",
] as const;
export type FlightStatus = (typeof flightStatuses)[number];

export const flights = sqliteTable("flights", {
  id: text("id").primaryKey(),
  flightNumber: text("flight_number").notNull(),
  departureAirport: text("departure_airport").notNull(),
  arrivalAirport: text("arrival_airport").notNull(),
  departureDate: text("departure_date").notNull(),
  arrivalDate: text("arrival_date").notNull(),
  airline: text("airline").notNull(),
  cabinClass: text("cabin_class"),
  maxPets: integer("max_pets").notNull(),
  status: text("status", { enum: flightStatuses }).notNull().default("scheduled"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
