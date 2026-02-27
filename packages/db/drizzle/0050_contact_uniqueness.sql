-- Enforce uniqueness on contact information after data deduplication.
-- Deploy order: API code first → run dedup endpoint → verify zero duplicates → apply this migration.

CREATE UNIQUE INDEX IF NOT EXISTS emails_email_unique ON emails (email);

CREATE UNIQUE INDEX IF NOT EXISTS phones_phone_number_unique ON phones (phone_number);

CREATE UNIQUE INDEX IF NOT EXISTS social_ids_platform_handle_unique
  ON social_ids (COALESCE(platform_id, '__no_platform__'), handle);

CREATE UNIQUE INDEX IF NOT EXISTS websites_url_unique ON websites (url);
