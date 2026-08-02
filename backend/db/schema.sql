CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  route_no VARCHAR(40) UNIQUE NOT NULL,
  source VARCHAR(120) NOT NULL,
  destination VARCHAR(120) NOT NULL,
  first_bus TIME,
  last_bus TIME,
  frequency_text VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buses (
  id SERIAL PRIMARY KEY,
  plate_no VARCHAR(40) UNIQUE,
  route_no VARCHAR(40),
  route_key VARCHAR(260),
  source VARCHAR(120),
  destination VARCHAR(120),
  moving_toward VARCHAR(160),
  current_fare_leg VARCHAR(80),
  status_text VARCHAR(120),
  speed_kmph NUMERIC(6,2),
  eta_to_next_stop_mins INT,
  route_id INT REFERENCES routes(id) ON DELETE CASCADE,
  bus_code VARCHAR(80),
  bus_name VARCHAR(140),
  total_seats INT NOT NULL DEFAULT 40,
  operator_name VARCHAR(100) NOT NULL DEFAULT 'City Transit',
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  bus_id INT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  departure_time TIME,
  arrival_time TIME,
  service_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS boarding_points (
  id SERIAL PRIMARY KEY,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  point_name VARCHAR(160) NOT NULL
);

CREATE TABLE IF NOT EXISTS dropping_points (
  id SERIAL PRIMARY KEY,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  point_name VARCHAR(160) NOT NULL
);

CREATE TABLE IF NOT EXISTS stops (
  id SERIAL PRIMARY KEY,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_name VARCHAR(160) NOT NULL,
  stop_order INT NOT NULL
);

CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  bus_id INT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  seat_no VARCHAR(12) NOT NULL,
  seat_type VARCHAR(20) NOT NULL DEFAULT 'regular',
  UNIQUE(bus_id, seat_no)
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_ref VARCHAR(24) UNIQUE NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bus_id INT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  journey_date DATE NOT NULL,
  boarding_point VARCHAR(160),
  dropping_point VARCHAR(160),
  passenger_name VARCHAR(140) NOT NULL,
  passenger_phone VARCHAR(30) NOT NULL,
  total_fare NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_seats (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  UNIQUE(booking_id, seat_id)
);

CREATE TABLE IF NOT EXISTS seat_inventory (
  id SERIAL PRIMARY KEY,
  bus_id INT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  journey_date DATE NOT NULL,
  seat_id INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (bus_id, journey_date, seat_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'MOCK',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  transaction_ref VARCHAR(40),
  paid_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_bus_location (
  id SERIAL PRIMARY KEY,
  bus_id INT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  speed_kmph NUMERIC(6,2),
  eta_minutes INT,
  progress_percent INT,
  next_stop VARCHAR(160),
  status_text VARCHAR(120),
  current_location_text VARCHAR(200),
  waypoint_1_lat NUMERIC(10,7),
  waypoint_1_long NUMERIC(10,7),
  waypoint_2_lat NUMERIC(10,7),
  waypoint_2_long NUMERIC(10,7),
  updated_by INT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(bus_id)
);

CREATE TABLE IF NOT EXISTS route_stops (
  id SERIAL PRIMARY KEY,
  route_key VARCHAR(260) NOT NULL,
  stop_name VARCHAR(160) NOT NULL,
  stop_order INT NOT NULL
);
