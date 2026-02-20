import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const routeInterests = sqliteTable(
  "route_interests",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    originCity: text("origin_city").notNull(),
    originCountry: text("origin_country").notNull(),
    destinationCity: text("destination_city").notNull(),
    destinationCountry: text("destination_country").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("route_interests_origin_dest_unique").on(
      table.originCity,
      table.originCountry,
      table.destinationCity,
      table.destinationCountry,
    ),
  ],
);
