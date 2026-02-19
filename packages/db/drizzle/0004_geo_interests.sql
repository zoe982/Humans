CREATE TABLE geo_interests (
  id TEXT PRIMARY KEY NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX geo_interests_city_country_unique ON geo_interests(city, country);

CREATE TABLE geo_interest_expressions (
  id TEXT PRIMARY KEY NOT NULL,
  human_id TEXT NOT NULL REFERENCES humans(id),
  geo_interest_id TEXT NOT NULL REFERENCES geo_interests(id),
  activity_id TEXT REFERENCES activities(id),
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX geo_interest_expressions_human_id_idx ON geo_interest_expressions(human_id);
CREATE INDEX geo_interest_expressions_geo_interest_id_idx ON geo_interest_expressions(geo_interest_id);
