CREATE TABLE bookings (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 60),
 day TEXT NOT NULL,
 desk INTEGER NOT NULL CHECK(desk BETWEEN 1 AND 4),
 start INTEGER NOT NULL CHECK(start >= 480 AND start % 30 = 0),
 end INTEGER NOT NULL CHECK(end <= 1080 AND end % 30 = 0 AND end > start)
);
CREATE INDEX bookings_day_desk ON bookings(day, desk);
CREATE INDEX bookings_day_owner ON bookings(day, owner);
-- Triggers enforce these rules inside the INSERT, even under concurrent requests.
CREATE TRIGGER booking_conflict BEFORE INSERT ON bookings
WHEN EXISTS(SELECT 1 FROM bookings WHERE day=NEW.day
 AND (desk=NEW.desk OR owner=NEW.owner) AND start<NEW.end AND end>NEW.start)
BEGIN SELECT RAISE(ABORT, 'booking_conflict'); END;
CREATE TRIGGER booking_quota BEFORE INSERT ON bookings
WHEN (SELECT COALESCE(SUM(end-start),0) FROM bookings WHERE day=NEW.day AND owner=NEW.owner)+NEW.end-NEW.start>120
BEGIN SELECT RAISE(ABORT, 'booking_quota'); END;
