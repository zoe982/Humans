ALTER TABLE `human_website_booking_requests` ADD COLUMN `opportunity_id` TEXT REFERENCES `opportunities`(`id`);
