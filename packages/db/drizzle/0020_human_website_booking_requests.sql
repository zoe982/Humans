CREATE TABLE `human_website_booking_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `human_id` text NOT NULL,
  `website_booking_request_id` text NOT NULL,
  `linked_at` text NOT NULL,
  FOREIGN KEY (`human_id`) REFERENCES `humans`(`id`)
);
