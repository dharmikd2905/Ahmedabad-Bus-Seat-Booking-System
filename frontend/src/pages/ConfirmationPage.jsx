import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { FaCheckCircle, FaBus, FaArrowRight, FaTicketAlt, FaHome } from "react-icons/fa";

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const result = JSON.parse(sessionStorage.getItem("bookingResult") || "{}");
  const draft  = JSON.parse(sessionStorage.getItem("bookingDraft")  || "{}");

  const bookingRef    = result.bookingRef   || "N/A";
  const totalFare     = result.totalFare    || 0;
  const plateNo       = draft.plateNo       || draft.busInfo?.plate_no || "–";
  const source        = draft.busInfo?.source      || draft.source      || "–";
  const destination   = draft.busInfo?.destination || draft.destination  || "–";
  const journeyDate   = draft.journeyDate   || "–";
  const boardingPoint = draft.boardingPoint || "–";
  const droppingPoint = draft.droppingPoint || "–";
  const seatIds       = draft.seatIds       || [];
  const passengerName = draft.passengerName || "–";
  const passengerPhone= draft.passengerPhone|| "–";

  // Compact data string embedded in the QR
  const qrValue = [
    `REF:${bookingRef}`,
    `BUS:${plateNo}`,
    `FROM:${source}`,
    `TO:${destination}`,
    `DATE:${journeyDate}`,
    `SEATS:${seatIds.join(",")}`,
    `PAX:${passengerName}`,
    `FARE:Rs.${totalFare}`,
  ].join("|");

  // Generate barcode heights deterministically from bookingRef
  const barHeights = Array.from({ length: 20 }, (_, i) => {
    const code = bookingRef.charCodeAt(i % bookingRef.length) || 65;
    return 14 + ((code * (i + 3)) % 22);
  });

  return (
    <div className="confirmation-page">

      {/* ── Success Banner ──────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "14px",
        marginBottom: "1.75rem", animation: "fadeIn 0.4s ease-out"
      }}>
        <div style={{
          width: 52, height: 52,
          background: "linear-gradient(135deg,#10b981,#059669)",
          borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 18px rgba(16,185,129,0.35)",
          flexShrink: 0
        }}>
          <FaCheckCircle color="#fff" size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
            Booking Confirmed!
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>
            Your e-ticket is ready. Show QR at boarding.
          </p>
        </div>
      </div>

      {/* ── Ticket Card ─────────────────────────────────────── */}
      <div className="ticket-card">

        {/* Header */}
        <div className="ticket-header">
          <div className="ticket-header-left">
            <h2><FaBus style={{ marginRight: 8, verticalAlign: "middle" }} />Ahmedabad CityBus</h2>
            <span className="ticket-badge">E-TICKET</span>
          </div>
          <div className="ticket-status-badge">
            <FaCheckCircle size={12} /> CONFIRMED
          </div>
        </div>

        {/* Route Strip */}
        <div className="ticket-route-strip">
          <div className="route-station">
            <div className="label">FROM</div>
            <div className="name">{source}</div>
            {boardingPoint !== "–" && (
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                ↳ {boardingPoint}
              </div>
            )}
          </div>
          <div className="route-arrow">
            <div className="route-arrow-line" />
            <FaArrowRight size={14} />
          </div>
          <div className="route-station" style={{ textAlign: "right" }}>
            <div className="label">TO</div>
            <div className="name">{destination}</div>
            {droppingPoint !== "–" && (
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                ↳ {droppingPoint}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Body — details + QR */}
        <div className="ticket-body">
          <div className="ticket-details-grid">
            <div className="detail-item">
              <div className="detail-label">Passenger</div>
              <div className="detail-value">{passengerName}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Phone</div>
              <div className="detail-value">{passengerPhone}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Bus / Plate</div>
              <div className="detail-value">{plateNo}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Journey Date</div>
              <div className="detail-value">{journeyDate}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Seats</div>
              <div className="detail-value">
                {seatIds.length ? seatIds.join(", ") : "–"}
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Total Fare</div>
              <div className="detail-value fare">Rs. {totalFare}</div>
            </div>
          </div>

          {/* QR Code */}
          <div className="ticket-qr-section">
            <QRCode
              value={qrValue}
              size={110}
              fgColor="#1e293b"
              bgColor="#ffffff"
              level="M"
            />
            <div className="ticket-qr-label">Scan at Gate</div>
          </div>
        </div>

        {/* Divider with notches */}
        <div className="ticket-divider">
          <hr className="ticket-divider-line" />
        </div>

        {/* Footer — booking ref + barcode */}
        <div className="ticket-footer">
          <div className="ticket-ref">
            BOOKING REF
            <span>{bookingRef}</span>
          </div>
          <div className="ticket-barcode">
            {barHeights.map((h, i) => (
              <span key={i} style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Buttons ──────────────────────────────────── */}
      <div className="confirmation-actions">
        <button
          className="btn ghost"
          onClick={() => navigate("/my-bookings")}
        >
          <FaTicketAlt /> My Bookings
        </button>
        <button
          className="btn"
          onClick={() => navigate("/")}
        >
          <FaHome /> Book Another
        </button>
      </div>
    </div>
  );
}
