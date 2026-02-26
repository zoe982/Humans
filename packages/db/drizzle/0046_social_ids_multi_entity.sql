-- Add entity FK columns to social_ids (same pattern as emails/phones from 0044)
ALTER TABLE `social_ids` ADD COLUMN `general_lead_id` text;
ALTER TABLE `social_ids` ADD COLUMN `website_booking_request_id` text;
ALTER TABLE `social_ids` ADD COLUMN `route_signup_id` text;

-- Add indexes for the new FK columns
CREATE INDEX IF NOT EXISTS `social_ids_general_lead_id_idx` ON `social_ids` (`general_lead_id`);
CREATE INDEX IF NOT EXISTS `social_ids_website_booking_request_id_idx` ON `social_ids` (`website_booking_request_id`);
CREATE INDEX IF NOT EXISTS `social_ids_route_signup_id_idx` ON `social_ids` (`route_signup_id`);
