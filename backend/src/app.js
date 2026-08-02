import "express-async-errors";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { body, validationResult } from "express-validator";
import { pool, query } from "./db.js";
import { authenticate, authorize } from "./middleware/auth.js";
import { ingestRows, readDatasetRows } from "./services/datasetService.js";

dotenv.config();

const app = express();
const upload = multer({ dest: "data/" });
const demoFare = 120;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) || "*",
    credentials: true,
  })
);
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ ok: true }));

// ── Stations ──────────────────────────────────────────────────────────────────
app.get("/api/stations", async (req, res) => {
  const prefix = String(req.query.prefix || "").trim();
  let result;
  if (prefix) {
    result = await query(
      "SELECT DISTINCT stop_name FROM route_stops WHERE stop_name LIKE ? ORDER BY stop_name",
      [`${prefix}%`]
    );
  } else {
    result = await query(
      "SELECT DISTINCT stop_name FROM route_stops ORDER BY stop_name"
    );
  }
  return res.json(result.rows.map((r) => r.stop_name));
});

// ── Auth: Signup ──────────────────────────────────────────────────────────────
app.post(
  "/api/auth/signup",
  [
    body("email").isEmail().withMessage("Invalid email address"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("fullName").notEmpty().withMessage("Full name is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res
        .status(400)
        .json({ message: errors.array()[0].msg, errors: errors.array() });

    const { fullName, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    // Check duplicate
    const existing = await query(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase()]
    );
    if (existing.rowCount)
      return res.status(409).json({ message: "Email already registered" });

    await query(
      "INSERT INTO users(full_name, email, password_hash, role) VALUES(?, ?, ?, 'customer')",
      [fullName, email.toLowerCase(), hash]
    );
    const userResult = await query(
      "SELECT id, email, role, full_name FROM users WHERE email = ?",
      [email.toLowerCase()]
    );
    const user = userResult.rows[0];
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );
    return res.status(201).json({ token, user });
  }
);

// ── Auth: Login ───────────────────────────────────────────────────────────────
app.post(
  "/api/auth/login",
  [
    body("email").isEmail().withMessage("Invalid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res
        .status(400)
        .json({ message: errors.array()[0].msg, errors: errors.array() });

    const { email, password } = req.body;
    const result = await query(
      "SELECT * FROM users WHERE email = ?",
      [email.toLowerCase()]
    );
    if (!result.rowCount)
      return res.status(401).json({ message: "Invalid email or password" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );
    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
      },
    });
  }
);

// ── Admin Login ───────────────────────────────────────────────────────────────
app.post(
  "/api/admin/login",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "").trim();
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin";

    if (username !== adminUser || password !== adminPass)
      return res.status(401).json({ message: "Invalid admin credentials" });

    const token = jwt.sign(
      { userId: 0, role: "admin", email: "admin@local", full_name: "Admin" },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "12h" }
    );
    return res.json({ token, admin: { full_name: "Admin", role: "admin" } });
  }
);

// ── Bus Search ────────────────────────────────────────────────────────────────
app.get("/api/buses/search", async (req, res) => {
  const { source, destination } = req.query;
  if (!source || !destination) return res.json([]);

  const result = await query(
    `SELECT b.id AS bus_id, b.plate_no, b.route_no, b.source, b.destination,
            b.status_text, b.speed_kmph, b.eta_to_next_stop_mins,
            l.latitude, l.longitude, l.next_stop,
            l.waypoint_1_lat, l.waypoint_1_long,
            l.waypoint_2_lat, l.waypoint_2_long,
            src.stop_order AS source_order, dst.stop_order AS destination_order
     FROM buses b
     JOIN route_stops src ON src.route_key = b.route_key
       AND LOWER(src.stop_name) = LOWER(?)
     JOIN route_stops dst ON dst.route_key = b.route_key
       AND LOWER(dst.stop_name) = LOWER(?)
     LEFT JOIN live_bus_location l ON l.bus_id = b.id
     WHERE src.stop_order < dst.stop_order
     ORDER BY b.route_no, b.plate_no`,
    [source.trim(), destination.trim()]
  );

  // Get seat counts separately (SQLite avoids subquery complexity)
  const buses = [];
  for (const row of result.rows) {
    const seatCount = await query(
      "SELECT COUNT(*) AS cnt FROM seats WHERE bus_id = ?",
      [row.bus_id]
    );
    const bookedCount = await query(
      "SELECT COUNT(*) AS cnt FROM seat_inventory WHERE bus_id = ? AND journey_date = DATE('now') AND status = 'BOOKED'",
      [row.bus_id]
    );
    buses.push({
      ...row,
      seat_count: seatCount.rows[0]?.cnt ?? 0,
      booked_count: bookedCount.rows[0]?.cnt ?? 0,
      seat_available:
        (seatCount.rows[0]?.cnt ?? 0) - (bookedCount.rows[0]?.cnt ?? 0),
    });
  }

  return res.json(buses);
});

// ── Bus by Plate ──────────────────────────────────────────────────────────────
app.get("/api/buses/plate/:plateNo", async (req, res) => {
  const busResult = await query(
    `SELECT b.*, l.latitude, l.longitude, l.next_stop
     FROM buses b
     LEFT JOIN live_bus_location l ON l.bus_id = b.id
     WHERE b.plate_no = ?`,
    [req.params.plateNo]
  );
  if (!busResult.rowCount)
    return res.status(404).json({ message: "Bus not found" });

  const stops = await query(
    "SELECT stop_name, stop_order FROM route_stops WHERE route_key = ? ORDER BY stop_order",
    [busResult.rows[0].route_key]
  );
  return res.json({ ...busResult.rows[0], stops: stops.rows });
});

// ── Seats for a Bus ───────────────────────────────────────────────────────────
app.get("/api/buses/:plateNo/seats", async (req, res) => {
  const busLookup = await query(
    "SELECT id FROM buses WHERE plate_no = ?",
    [req.params.plateNo]
  );
  if (!busLookup.rowCount)
    return res.status(404).json({ message: "Bus not found" });

  const busId = busLookup.rows[0].id;
  const { date } = req.query;
  const seats = await query(
    "SELECT id, seat_no, seat_type FROM seats WHERE bus_id = ? ORDER BY seat_no",
    [busId]
  );
  const inventory = await query(
    "SELECT seat_id, status FROM seat_inventory WHERE bus_id = ? AND journey_date = ?",
    [busId, date]
  );
  const statusMap = new Map(inventory.rows.map((r) => [r.seat_id, r.status]));
  return res.json(
    seats.rows.map((s) => ({
      ...s,
      status: statusMap.get(s.id) || "AVAILABLE",
    }))
  );
});

// ── Book Seats ────────────────────────────────────────────────────────────────
app.post("/api/bookings", authenticate, async (req, res) => {
  const {
    plateNo,
    journeyDate,
    seatIds,
    passengerName,
    passengerPhone,
    boardingPoint,
    droppingPoint,
  } = req.body;

  if (!Array.isArray(seatIds) || !seatIds.length)
    return res.status(400).json({ message: "Select at least one seat" });

  const busLookup = await query(
    "SELECT id, route_no, route_key FROM buses WHERE plate_no = ?",
    [plateNo]
  );
  if (!busLookup.rowCount)
    return res.status(404).json({ message: "Bus not found for plate number" });

  const busId = busLookup.rows[0].id;

  // Check seat availability
  for (const seatId of seatIds) {
    const booked = await query(
      "SELECT id FROM seat_inventory WHERE bus_id = ? AND journey_date = ? AND seat_id = ? AND status = 'BOOKED'",
      [busId, journeyDate, seatId]
    );
    if (booked.rowCount)
      return res
        .status(409)
        .json({ message: "Some seats are already booked. Refresh seat map." });
  }

  // Mark seats booked
  for (const seatId of seatIds) {
    await query(
      `INSERT INTO seat_inventory(bus_id, journey_date, seat_id, status)
       VALUES(?, ?, ?, 'BOOKED')
       ON CONFLICT(bus_id, journey_date, seat_id)
       DO UPDATE SET status = 'BOOKED', updated_at = CURRENT_TIMESTAMP`,
      [busId, journeyDate, seatId]
    );
  }

  const bookingRef = `BK${Date.now().toString().slice(-8)}`;
  await query(
    `INSERT INTO bookings(booking_ref, user_id, bus_id, route_id, journey_date,
       boarding_point, dropping_point, passenger_name, passenger_phone, total_fare)
     VALUES(?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    [
      bookingRef,
      req.user.userId,
      busId,
      journeyDate,
      boardingPoint || null,
      droppingPoint || null,
      passengerName,
      passengerPhone,
      seatIds.length * demoFare,
    ]
  );
  const bookingResult = await query(
    "SELECT id FROM bookings WHERE booking_ref = ?",
    [bookingRef]
  );
  const bookingId = bookingResult.rows[0].id;

  for (const seatId of seatIds) {
    await query(
      "INSERT INTO booking_seats(booking_id, seat_id) VALUES (?, ?)",
      [bookingId, seatId]
    );
    await query(
      "UPDATE seat_inventory SET booking_id = ?, updated_at = CURRENT_TIMESTAMP WHERE bus_id = ? AND journey_date = ? AND seat_id = ?",
      [bookingId, busId, journeyDate, seatId]
    );
  }

  await query(
    "INSERT INTO payments(booking_id, amount, payment_method, payment_status, transaction_ref) VALUES(?, ?, 'MOCK', 'SUCCESS', ?)",
    [bookingId, seatIds.length * demoFare, `TXN-${bookingRef}`]
  );

  return res
    .status(201)
    .json({ bookingId, bookingRef, totalFare: seatIds.length * demoFare });
});

// ── My Bookings ───────────────────────────────────────────────────────────────
app.get("/api/bookings/me", authenticate, async (req, res) => {
  const result = await query(
    `SELECT b.*, bus.route_no, bus.source, bus.destination, bus.bus_name, bus.plate_no
     FROM bookings b
     JOIN buses bus ON bus.id = b.bus_id
     WHERE b.user_id = ? ORDER BY b.created_at DESC`,
    [req.user.userId]
  );
  return res.json(result.rows);
});

// ── Cancel Booking ────────────────────────────────────────────────────────────
app.post("/api/bookings/:bookingId/cancel", authenticate, async (req, res) => {
  const booking = await query(
    "SELECT * FROM bookings WHERE id = ? AND user_id = ?",
    [req.params.bookingId, req.user.userId]
  );
  if (!booking.rowCount)
    return res.status(404).json({ message: "Booking not found" });

  await query("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", [
    booking.rows[0].id,
  ]);
  await query(
    "UPDATE seat_inventory SET status = 'AVAILABLE', booking_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?",
    [booking.rows[0].id]
  );
  return res.json({ message: "Booking cancelled" });
});

// ── Tracking ──────────────────────────────────────────────────────────────────
app.get("/api/tracking/:busId", async (req, res) => {
  const busLookup = await query(
    "SELECT id, plate_no, route_no, destination, moving_toward FROM buses WHERE plate_no = ?",
    [req.params.busId]
  );
  if (!busLookup.rowCount)
    return res.status(404).json({ message: "Bus not found" });

  const result = await query(
    "SELECT * FROM live_bus_location WHERE bus_id = ?",
    [busLookup.rows[0].id]
  );
  if (!result.rowCount)
    return res.status(404).json({ message: "Tracking unavailable" });

  return res.json({ ...result.rows[0], ...busLookup.rows[0] });
});

// ── Admin: Update Tracking ────────────────────────────────────────────────────
app.put(
  "/api/admin/tracking/:busId",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    const busLookup = await query(
      "SELECT id FROM buses WHERE plate_no = ?",
      [req.params.busId]
    );
    if (!busLookup.rowCount)
      return res.status(404).json({ message: "Bus not found" });

    const busId = busLookup.rows[0].id;
    const {
      latitude,
      longitude,
      speedKmph,
      etaMinutes,
      progressPercent,
      nextStop,
      statusText,
      currentLocation,
    } = req.body;

    await query(
      `INSERT INTO live_bus_location
         (bus_id, latitude, longitude, speed_kmph, eta_minutes, progress_percent,
          next_stop, status_text, current_location_text, updated_by)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(bus_id) DO UPDATE SET
         latitude = excluded.latitude,
         longitude = excluded.longitude,
         speed_kmph = excluded.speed_kmph,
         eta_minutes = excluded.eta_minutes,
         progress_percent = excluded.progress_percent,
         next_stop = excluded.next_stop,
         status_text = excluded.status_text,
         current_location_text = excluded.current_location_text,
         updated_by = excluded.updated_by,
         updated_at = CURRENT_TIMESTAMP`,
      [
        busId,
        latitude ?? 0,
        longitude ?? 0,
        speedKmph || null,
        etaMinutes || null,
        progressPercent || null,
        nextStop || null,
        statusText || null,
        currentLocation || null,
        req.user.userId || null,
      ]
    );

    const updated = await query(
      "SELECT * FROM live_bus_location WHERE bus_id = ?",
      [busId]
    );
    return res.json(updated.rows[0]);
  }
);

// ── Admin: Today Buses ────────────────────────────────────────────────────────
app.get(
  "/api/admin/today-buses",
  authenticate,
  authorize("admin"),
  async (_, res) => {
    const result = await query(
      `SELECT b.id AS bus_id, b.plate_no, b.route_no, b.source, b.destination,
              b.speed_kmph, b.eta_to_next_stop_mins,
              COALESCE(lbl.status_text, 'Not updated') AS trip_status,
              lbl.next_stop, lbl.eta_minutes, lbl.latitude, lbl.longitude, lbl.updated_at
       FROM buses b
       LEFT JOIN live_bus_location lbl ON lbl.bus_id = b.id
       ORDER BY b.route_no, b.plate_no`
    );

    const busStats = [];
    for (const row of result.rows) {
      const seats = await query(
        "SELECT COUNT(*) AS total FROM seats WHERE bus_id = ?",
        [row.bus_id]
      );
      const booked = await query(
        "SELECT COUNT(*) AS cnt FROM seat_inventory WHERE bus_id = ? AND journey_date = DATE('now') AND status = 'BOOKED'",
        [row.bus_id]
      );
      busStats.push({
        ...row,
        seat_count: seats.rows[0]?.total ?? 0,
        booked_count: booked.rows[0]?.cnt ?? 0,
        available_seats:
          (seats.rows[0]?.total ?? 0) - (booked.rows[0]?.cnt ?? 0),
      });
    }

    return res.json({ buses: busStats, date: new Date().toISOString().split("T")[0] });
  }
);

// ── Admin: All Bookings ───────────────────────────────────────────────────────
app.get(
  "/api/admin/bookings",
  authenticate,
  authorize("admin"),
  async (_, res) => {
    const result = await query(
      `SELECT b.*, u.email AS user_email, u.full_name AS user_name,
              bus.plate_no, bus.route_no, bus.source, bus.destination
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN buses bus ON bus.id = b.bus_id
       ORDER BY b.created_at DESC`
    );
    return res.json(result.rows);
  }
);

// ── Admin: Dataset Reload ─────────────────────────────────────────────────────
app.post(
  "/api/admin/dataset/reload",
  authenticate,
  authorize("admin"),
  async (_, res) => {
    const datasetPath =
      process.env.DATASET_PATH || "./data/dataset.csv";
    const rows = readDatasetRows(datasetPath);
    await ingestRows(rows);
    return res.json({ message: "Dataset reloaded", rows: rows.length });
  }
);

// ── Admin: Dataset Upload ─────────────────────────────────────────────────────
app.post(
  "/api/admin/dataset/upload",
  authenticate,
  authorize("admin"),
  upload.single("dataset"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "Dataset file required" });
    const rows = readDatasetRows(req.file.path);
    await ingestRows(rows);
    return res.json({ message: "Dataset ingested", rows: rows.length });
  }
);

app.post("/api/tracking/simulate", async (_, res) =>
  res.json({ message: "Simulation tick skipped for frontend rendering" })
);

// ── Admin: Bus Seat & Booking Details ────────────────────────────────────────
app.get(
  "/api/admin/buses/:plateNo/details",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    const plateNo = req.params.plateNo;

    // Get bus info
    const busResult = await query(
      `SELECT b.*, l.latitude, l.longitude, l.next_stop, l.status_text AS live_status,
              l.current_location_text, l.eta_minutes
       FROM buses b
       LEFT JOIN live_bus_location l ON l.bus_id = b.id
       WHERE b.plate_no = ?`,
      [plateNo]
    );
    if (!busResult.rowCount)
      return res.status(404).json({ message: "Bus not found" });

    const bus = busResult.rows[0];
    const today = new Date().toISOString().split("T")[0];

    // Get all seats for this bus
    const seatsResult = await query(
      "SELECT id, seat_no, seat_type FROM seats WHERE bus_id = ? ORDER BY seat_no",
      [bus.id]
    );

    // Get today's inventory + booking details for booked seats
    const inventoryResult = await query(
      `SELECT si.seat_id, si.status, si.booking_id,
              bk.passenger_name, bk.passenger_phone,
              bk.boarding_point, bk.dropping_point,
              bk.status AS booking_status, bk.created_at AS booking_created_at
       FROM seat_inventory si
       LEFT JOIN bookings bk ON bk.id = si.booking_id
       WHERE si.bus_id = ? AND si.journey_date = ?`,
      [bus.id, today]
    );

    // Build a map: seat_id → inventory row
    const invMap = new Map(inventoryResult.rows.map((r) => [r.seat_id, r]));

    const seats = seatsResult.rows.map((s) => {
      const inv = invMap.get(s.id);
      return {
        seat_id: s.id,
        seat_no: s.seat_no,
        seat_type: s.seat_type,
        seat_status: inv?.status || "AVAILABLE",
        passenger_name: inv?.passenger_name || null,
        passenger_phone: inv?.passenger_phone || null,
        boarding_point: inv?.boarding_point || null,
        dropping_point: inv?.dropping_point || null,
        booking_status: inv?.booking_status || null,
        booking_created_at: inv?.booking_created_at || null,
      };
    });

    return res.json({ bus, seats, journeyDate: today });
  }
);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: err.message || "Internal server error" });
});

export default app;
