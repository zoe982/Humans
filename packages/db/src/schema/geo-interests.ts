import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const geoInterests = pgTable(
  "geo_interests",
  {
    id: text("id").primaryKey(),
    displayId: text("display_id").notNull().unique(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("geo_interests_city_country_unique").on(table.city, table.country)],
);
