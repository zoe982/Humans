-- Enforce one-human-per-lead on junction tables
CREATE UNIQUE INDEX human_route_signups_route_signup_id_unique
  ON human_route_signups (route_signup_id);
CREATE UNIQUE INDEX human_website_booking_requests_wbr_id_unique
  ON human_website_booking_requests (website_booking_request_id);
