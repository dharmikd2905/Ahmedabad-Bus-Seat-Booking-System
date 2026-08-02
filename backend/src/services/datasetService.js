import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { getDb } from "../db.js";

/**
 * Parse numeric value from strings like "19 km/h" or "24 mins" or plain numbers.
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parse a "lat, long" string into { lat, long }.
 */
function parseWaypoint(value) {
  const raw = String(value || "").trim();
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length < 2) return { lat: null, long: null };
  return {
    lat: parseNumber(parts[0]),
    long: parseNumber(parts[1]),
  };
}

/**
 * New dataset columns:
 *   Plate No, Route, Source, Destination,
 *   Current Lat, Current Long,
 *   Next Waypoint 1, Next Waypoint 2,
 *   Speed, ETA to Next Stop, Status
 */
function normalizeRows(rawRows) {
  return rawRows.map((r) => ({
    plateNo:     (r["Plate No"]        ?? r["PlateNo"] ?? "").toString().trim(),
    route:       (r["Route"]           ?? "").toString().trim(),
    source:      (r["Source"]          ?? "").toString().trim(),
    destination: (r["Destination"]     ?? "").toString().trim(),
    currentLat:  parseNumber(r["Current Lat"]),
    currentLong: parseNumber(r["Current Long"]),
    waypoint1:   parseWaypoint(r["Next Waypoint 1"] ?? r["Next Waypoint"] ?? ""),
    waypoint2:   parseWaypoint(r["Next Waypoint 2"] ?? ""),
    speedKmph:   parseNumber(r["Speed"]),            // "19 km/h" → 19
    etaMins:     parseNumber(r["ETA to Next Stop"]),  // "24 mins" → 24
    status:      (r["Status"] ?? "").toString().trim(),
  }));
}

export function readDatasetRows(filePath) {
  const abs = path.resolve(filePath);
  const ext = path.extname(abs).toLowerCase();

  if (ext === ".json") {
    return normalizeRows(JSON.parse(fs.readFileSync(abs, "utf-8")));
  }

  const wb = xlsx.readFile(abs);
  const firstSheet = wb.SheetNames[0];
  const rawRows = xlsx.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: "" });
  return normalizeRows(rawRows);
}

export async function ingestRows(rows) {
  const db = await getDb();

  // Run everything inside a single transaction for speed (1483 rows × 40 seats)
  await db.run("BEGIN");
  try {
    // Clear existing data
    await db.run("DELETE FROM live_bus_location");
    await db.run("DELETE FROM route_stops");
    await db.run("DELETE FROM seats");
    await db.run("DELETE FROM buses");
    await db.run("DELETE FROM routes");

    // Collect unique routes and stop maps
    const routeNos = new Map();     // route_no → id (populated below)
    const routeStopMap = new Map(); // routeKey → [source, destination]

    // Pass 1: insert routes
    for (const row of rows) {
      if (!row.plateNo || !row.route || !row.source || !row.destination) continue;
      if (!routeNos.has(row.route)) {
        await db.run(
          "INSERT OR IGNORE INTO routes(route_no, source, destination, frequency_text) VALUES (?, ?, ?, ?)",
          [row.route, row.source, row.destination, "dataset-v2"]
        );
        const r = await db.get("SELECT id FROM routes WHERE route_no = ?", [row.route]);
        routeNos.set(row.route, r?.id ?? 1);
      }
    }

    // Pass 2: insert buses + seats + live location
    for (const row of rows) {
      if (!row.plateNo || !row.route || !row.source || !row.destination) continue;

      const routeKey = `${row.route}::${row.source}::${row.destination}`;
      if (!routeStopMap.has(routeKey)) {
        routeStopMap.set(routeKey, [row.source, row.destination]);
      }

      const routeId = routeNos.get(row.route) ?? 1;

      await db.run(
        `INSERT OR IGNORE INTO buses
           (plate_no, route_no, route_key, source, destination,
            status_text, speed_kmph, eta_to_next_stop_mins,
            total_seats, bus_name, route_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 40, ?, ?)`,
        [
          row.plateNo, row.route, routeKey,
          row.source, row.destination,
          row.status || null,
          row.speedKmph, row.etaMins,
          `Bus ${row.plateNo}`, routeId,
        ]
      );

      const busRow = await db.get("SELECT id FROM buses WHERE plate_no = ?", [row.plateNo]);
      const busId = busRow?.id;
      if (!busId) continue;

      // Insert 40 seats
      for (let i = 1; i <= 40; i++) {
        const seatNo = `S${String(i).padStart(2, "0")}`;
        const seatType = i % 8 === 0 ? "female_reserved" : "regular";
        await db.run(
          "INSERT OR IGNORE INTO seats(bus_id, seat_no, seat_type) VALUES (?, ?, ?)",
          [busId, seatNo, seatType]
        );
      }

      // Insert live location
      await db.run(
        `INSERT OR REPLACE INTO live_bus_location
           (bus_id, latitude, longitude, speed_kmph, eta_minutes,
            next_stop, status_text,
            waypoint_1_lat, waypoint_1_long,
            waypoint_2_lat, waypoint_2_long)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          busId,
          row.currentLat || 0, row.currentLong || 0,
          row.speedKmph || null, row.etaMins || null,
          row.destination || null,
          row.status || null,
          row.waypoint1.lat, row.waypoint1.long,
          row.waypoint2.lat, row.waypoint2.long,
        ]
      );
    }

    // Pass 3: insert route stops (Source = 1, Destination = 2)
    for (const [routeKey, stops] of routeStopMap.entries()) {
      for (let i = 0; i < stops.length; i++) {
        await db.run(
          "INSERT INTO route_stops(route_key, stop_name, stop_order) VALUES (?, ?, ?)",
          [routeKey, stops[i], i + 1]
        );
      }
    }

    await db.run("COMMIT");
  } catch (err) {
    await db.run("ROLLBACK");
    throw err;
  }
}
