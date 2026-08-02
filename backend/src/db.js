import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";

let dbInstance = null;

export { getDb };

async function getDb() {
  if (dbInstance) return dbInstance;

  const dbDir = path.resolve("data");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  dbInstance = await open({
    filename: path.join(dbDir, "database.sqlite"),
    driver: sqlite3.Database,
  });

  await dbInstance.exec("PRAGMA journal_mode = WAL;");
  await dbInstance.exec("PRAGMA foreign_keys = ON;");

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT DEFAULT 'customer',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_no TEXT UNIQUE,
      source TEXT,
      destination TEXT,
      frequency_text TEXT
    );

    CREATE TABLE IF NOT EXISTS buses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_no TEXT UNIQUE,
      route_no TEXT,
      route_key TEXT,
      source TEXT,
      destination TEXT,
      moving_toward TEXT,
      current_fare_leg TEXT,
      status_text TEXT,
      speed_kmph REAL,
      eta_to_next_stop_mins INTEGER,
      total_seats INTEGER DEFAULT 40,
      bus_name TEXT,
      route_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS route_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_key TEXT NOT NULL,
      stop_name TEXT NOT NULL,
      stop_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER,
      seat_no TEXT,
      seat_type TEXT DEFAULT 'regular',
      UNIQUE(bus_id, seat_no)
    );

    CREATE TABLE IF NOT EXISTS seat_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_id INTEGER,
      journey_date TEXT,
      seat_id INTEGER,
      status TEXT DEFAULT 'AVAILABLE',
      booking_id INTEGER,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(bus_id, journey_date, seat_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT,
      user_id INTEGER,
      bus_id INTEGER,
      route_id INTEGER,
      journey_date TEXT,
      boarding_point TEXT,
      dropping_point TEXT,
      passenger_name TEXT,
      passenger_phone TEXT,
      total_fare REAL,
      status TEXT DEFAULT 'CONFIRMED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS booking_seats (
      booking_id INTEGER,
      seat_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS live_bus_location (
      bus_id INTEGER UNIQUE,
      latitude REAL,
      longitude REAL,
      speed_kmph REAL,
      eta_minutes INTEGER,
      progress_percent INTEGER,
      next_stop TEXT,
      status_text TEXT,
      current_location_text TEXT,
      updated_by INTEGER,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      waypoint_1_lat REAL,
      waypoint_1_long REAL,
      waypoint_2_lat REAL,
      waypoint_2_long REAL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      amount REAL,
      payment_method TEXT,
      payment_status TEXT,
      transaction_ref TEXT
    );
  `);

  return dbInstance;
}

/**
 * Universal query helper that mimics the pg `{ rows, rowCount }` shape
 * so the rest of app.js / datasetService.js needs minimal changes.
 *
 * Param placeholder:  Use ? (SQLite style) directly.
 * We auto-convert $1,$2… → ? for any SQL that still uses Postgres style.
 */
export async function query(sql, params = []) {
  const db = await getDb();

  // Transliterate Postgres-style placeholders and functions
  const normalized = sql
    .replace(/\$\d+/g, "?")
    .replace(/ILIKE/gi, "LIKE")
    .replace(/::text/gi, "")
    .replace(/::int/gi, "")
    .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/CURRENT_DATE/gi, "DATE('now')")
    // Strip RETURNING clauses — handled separately via lastID
    .replace(/RETURNING\s+[\w\s,*]+/gi, "");

  const upper = normalized.trim().toUpperCase();
  const isRead = upper.startsWith("SELECT") || upper.startsWith("PRAGMA");

  if (isRead) {
    const rows = await db.all(normalized, params);
    return { rows, rowCount: rows.length };
  } else {
    const result = await db.run(normalized, params);
    // Attach lastID on rows[0] so callers using `.rows[0].id` still work
    const rows = result.lastID ? [{ id: result.lastID }] : [];
    return { rows, rowCount: result.changes ?? 0, lastID: result.lastID };
  }
}

/**
 * Transaction helper — returns a client-like object with .query()/.release()
 * SQLite is file-level serialised so this is just a thin wrapper.
 */
export const pool = {
  connect: async () => {
    const db = await getDb();
    return {
      query: (sql, params = []) => query(sql, params),
      release: () => {},
    };
  },
};
