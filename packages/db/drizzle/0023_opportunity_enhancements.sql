ALTER TABLE opportunities ADD COLUMN notes text;
ALTER TABLE opportunities ADD COLUMN next_action_start_date text;
ALTER TABLE opportunities ADD COLUMN passenger_seats integer NOT NULL DEFAULT 1;
ALTER TABLE opportunities ADD COLUMN pet_seats integer NOT NULL DEFAULT 0;
UPDATE opportunities SET passenger_seats = seats_requested;
