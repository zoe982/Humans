CREATE TABLE `loss_reasons_config` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX `loss_reasons_config_name_unique` ON `loss_reasons_config` (`name`);

-- Seed default loss reasons
INSERT INTO `loss_reasons_config` (`id`, `name`, `created_at`) VALUES
  ('lr_price_budget', 'Price/Budget', '2026-02-27T00:00:00.000Z'),
  ('lr_alternative_solution', 'Alternative Solution', '2026-02-27T00:00:00.000Z'),
  ('lr_date', 'Date', '2026-02-27T00:00:00.000Z'),
  ('lr_no_response', 'No Response', '2026-02-27T00:00:00.000Z'),
  ('lr_unknown', 'Unknown', '2026-02-27T00:00:00.000Z');
