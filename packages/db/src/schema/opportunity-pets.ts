import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { opportunities } from "./opportunities";
import { pets } from "./pets";

export const opportunityPets = sqliteTable(
  "opportunity_pets",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    petId: text("pet_id")
      .notNull()
      .references(() => pets.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("opportunity_pets_opportunity_id_idx").on(table.opportunityId),
    index("opportunity_pets_pet_id_idx").on(table.petId),
  ],
);
