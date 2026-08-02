import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import {
  FaBus, FaClipboardList, FaMapMarkerAlt, FaCalendarAlt,
  FaChair, FaPhoneAlt, FaArrowRight, FaCheckCircle, FaTimesCircle
} from "react-icons/fa";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function MyBookingsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.get("/bookings/me")
      .then((res) => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  async function cancel(bookingId) {
    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      setRows((prev) =>
        prev.map((r) => (r.id === bookingId ? { ...r, status: "CANCELLED" } : r))
      );
      toast("Booking cancelled successfully.", "info");
    } catch {
      toast("Failed to cancel booking. Please try again.", "error");
    }
  }

  // Build QR value from booking row data
  function buildQrValue(b) {
    return [
      `REF:${b.booking_ref}`,
      `BUS:${b.plate_no}`,
      `FROM:${b.source}`,
      `TO:${b.destination}`,
      `DATE:${b.journey_date}`,
      `SEATS:${b.seat_ids || ""}`,
      `PAX:${b.passenger_name || ""}`,
      `FARE:Rs.${b.total_fare || 0}`,
    ].join("|");
  }

  // Deterministic barcode heights from booking_ref
  function barHeights(ref = "REF") {
    return Array.from({ length: 16 }, (_, i) => {
      const code = ref.charCodeAt(i % ref.length) || 65;
      return 10 + ((code * (i + 3)) % 18);
    });
  }

  if (loading) {
    return (
      <div className="page" style={{ textAlign: "center", padding: "100px" }}>
        <div className="loader" />
        <p style={{ marginTop: "20px", color: "var(--muted)" }}>Loading your bookings…</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="my-bookings-page">
        <div className="bookings-header">
          <h1>My Bookings</h1>
          <p>Your travel history will appear here.</p>
        </div>
        <div className="empty-bookings">
          <FaClipboardList size={64} />
          <h3>No bookings yet</h3>
          <p>Once you book a seat, your e-tickets will appear here.</p>
          <Link to="/" className="btn" style={{ marginTop: "1.5rem", display: "inline-flex", gap: "8px", alignItems: "center" }}>
            <FaBus /> Find a Bus
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="my-bookings-page">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <p>{rows.length} {rows.length === 1 ? "ticket" : "tickets"} found</p>
      </div>

      {rows.map((b) => {
        const isCancelled = b.status === "CANCELLED";
        const bars = barHeights(b.booking_ref);
        const seats = Array.isArray(b.seat_ids)
          ? b.seat_ids
          : (b.seat_ids || "").toString().split(",").filter(Boolean);

        return (
          <div
            key={b.id}
            className={`booking-ticket-card${isCancelled ? " cancelled-card" : ""}`}
          >
            {/* ── Card Header ─────────────────────────────── */}
            <div className={`booking-card-header${isCancelled ? " cancelled" : ""}`}>
              <span className="booking-ref-chip">
                <FaBus style={{ marginRight: 6, verticalAlign: "middle" }} />
                {b.plate_no}
              </span>
              <div className={`ticket-status-badge${isCancelled ? " cancelled" : ""}`}>
                {isCancelled
                  ? <><FaTimesCircle size={11} /> CANCELLED</>
                  : <><FaCheckCircle size={11} /> CONFIRMED</>
                }
              </div>
            </div>

            {/* ── Card Body ───────────────────────────────── */}
            <div className="booking-card-body">
              <div className="booking-route-info">

                {/* Route flow */}
                <div className="booking-route-flow">
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <FaMapMarkerAlt size={11} style={{ color: "var(--brand)", flexShrink: 0 }} />
                    <span>{b.source}</span>
                  </div>
                  <div className="booking-route-dot" />
                  <FaArrowRight size={11} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  <div className="booking-route-dot" />
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <FaMapMarkerAlt size={11} style={{ color: "var(--brand-2)", flexShrink: 0 }} />
                    <span>{b.destination}</span>
                  </div>
                </div>

                {/* Meta chips */}
                <div className="booking-meta-chips">
                  <span className="meta-chip">
                    <FaCalendarAlt />
                    {b.journey_date}
                  </span>
                  {seats.length > 0 && (
                    <span className="meta-chip">
                      <FaChair />
                      Seat{seats.length > 1 ? "s" : ""}: {seats.join(", ")}
                    </span>
                  )}
                  {b.passenger_name && (
                    <span className="meta-chip">
                      {b.passenger_name}
                    </span>
                  )}
                  {b.passenger_phone && (
                    <span className="meta-chip">
                      <FaPhoneAlt />
                      {b.passenger_phone}
                    </span>
                  )}
                </div>
              </div>

              {/* QR Code — only for confirmed tickets */}
              {!isCancelled && (
                <div className="booking-qr-mini">
                  <QRCode
                    value={buildQrValue(b)}
                    size={72}
                    fgColor="#1e293b"
                    bgColor="#f8fafc"
                    level="M"
                  />
                  <div className="booking-qr-mini-label">Scan at Gate</div>
                </div>
              )}
            </div>

            {/* ── Card Footer ─────────────────────────────── */}
            <div className="booking-card-footer">
              <div>
                <div className="ticket-ref" style={{ marginBottom: 0 }}>
                  REF
                  <span style={{ fontSize: "0.85rem" }}>{b.booking_ref}</span>
                </div>
                <div className="ticket-barcode" style={{ marginTop: 6 }}>
                  {bars.map((h, i) => (
                    <span
                      key={i}
                      style={{
                        height: `${h}px`,
                        background: isCancelled ? "#cbd5e1" : "#94a3b8"
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                <span className="fare-chip">Rs. {b.total_fare || 0}</span>
                {!isCancelled && (
                  <button
                    className="cancel-btn"
                    onClick={() => cancel(b.id)}
                  >
                    Cancel Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
