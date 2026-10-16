CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  state TEXT,
  country TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  tz TEXT NOT NULL,
  centroid INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_locations_search ON locations(name, state, country);

-- Seed data: major cities with timezone info
INSERT INTO locations (name, state, country, latitude, longitude, tz, centroid) VALUES
  ('Kuala Lumpur', 'Kuala Lumpur', 'Malaysia', 3.1390, 101.6869, 'Asia/Kuala_Lumpur', 0),
  ('Kuching', 'Sarawak', 'Malaysia', 1.5533, 110.3461, 'Asia/Kuching', 0),
  ('Bangkok', 'Bangkok', 'Thailand', 13.7563, 100.5018, 'Asia/Bangkok', 0),
  ('Singapore', 'Singapore', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore', 0),
  ('Mumbai', 'Maharashtra', 'India', 19.0760, 72.8777, 'Asia/Kolkata', 0),
  ('Delhi', 'Delhi', 'India', 28.7041, 77.1025, 'Asia/Kolkata', 0),
  ('Kolkata', 'West Bengal', 'India', 22.5726, 88.3639, 'Asia/Kolkata', 0),
  ('Chennai', 'Tamil Nadu', 'India', 13.0827, 80.2707, 'Asia/Kolkata', 0),
  ('Bangalore', 'Karnataka', 'India', 12.9716, 77.5946, 'Asia/Kolkata', 0),
  ('New York', 'New York', 'USA', 40.7128, -74.0060, 'America/New_York', 0),
  ('Los Angeles', 'California', 'USA', 34.0522, -118.2437, 'America/Los_Angeles', 0),
  ('London', 'England', 'UK', 51.5074, -0.1278, 'Europe/London', 0),
  ('Paris', 'Île-de-France', 'France', 48.8566, 2.3522, 'Europe/Paris', 0),
  ('Tokyo', 'Tokyo', 'Japan', 35.6762, 139.6503, 'Asia/Tokyo', 0),
  ('Sydney', 'New South Wales', 'Australia', -33.8688, 151.2093, 'Australia/Sydney', 0),
  ('India', NULL, 'India', 20.5937, 78.9629, 'Asia/Kolkata', 1);
