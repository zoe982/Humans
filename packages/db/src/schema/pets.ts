import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { clients } from "./clients";

export const pets = sqliteTable("pets", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  name: text("name").notNull(),
  breed: text("breed"),
  weight: real("weight"),
  age: integer("age"),
  specialNeeds: text("special_needs"),
  healthCertR2Key: text("health_cert_r2_key"),
  vaccinationR2Key: text("vaccination_r2_key"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
