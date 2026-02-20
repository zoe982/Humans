ALTER TABLE `pets` ADD COLUMN `type` text NOT NULL DEFAULT 'dog';
ALTER TABLE `pets` DROP COLUMN `age`;
ALTER TABLE `pets` DROP COLUMN `special_needs`;
ALTER TABLE `pets` DROP COLUMN `health_cert_r2_key`;
ALTER TABLE `pets` DROP COLUMN `vaccination_r2_key`;
