import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const geoInterests = sqliteTable(
  "geo_interests",
  {
    id: text("id").primaryKey(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("geo_interests_city_country_unique").on(table.city, table.country)],
);
