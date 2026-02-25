CREATE UNIQUE INDEX IF NOT EXISTS "activities_front_id_unique"
  ON "activities" ("front_id")
  WHERE "front_id" IS NOT NULL;
