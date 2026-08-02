import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaChevronLeft, FaInfoCircle, FaUserCircle } from "react-icons/fa";
import api from "../services/api";
import BookingStepper from "../components/BookingStepper";
import { useToast } from "../components/Toast";

function getSeatState(seat, selected) {
  if (selected.includes(seat.id)) return "selected";
  if (seat.status === "BOOKED") return "booked";
  if (seat.seat_type === "female_reserved") return "female_reserved";
  return "available";
}

function buildBusRows(seats) {
  const rows = [];
  for (let i = 0; i < seats.length; i += 4) {
    rows.push(seats.slice(i, i + 4));
  }
  return rows;
}

export default function SeatSelectionPage() {
  const { plateNo } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busInfo, setBusInfo] = useState(null);
  const journeyDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.get(`/buses/${plateNo}/seats`, { params: { date: journeyDate } }).then((res) => setSeats(res.data));
    api.get(`/buses/plate/${plateNo}`).then((res) => setBusInfo(res.data));
  }, [plateNo, journeyDate]);

  const total = useMemo(() => selected.length * 120, [selected]);
  const seatRows = useMemo(() => buildBusRows(seats), [seats]);

  function toggleSeat(seat) {
    const state = getSeatState(seat, selected);
    if (state === "booked" || state === "female_reserved") return;
    setSelected((prev) => (prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]));
  }

  function proceed() {
    if (!selected.length) return;

    sessionStorage.setItem("bookingDraft", JSON.stringify({
      plateNo,
      seatIds: selected,
      journeyDate,
      busInfo,
      totalFare: total
    }));

    const token = localStorage.getItem("token");
    if (!token) {
      toast("Please sign in to continue booking.", "info");
      navigate("/auth?redirect=%2Fboarding-dropping", {
        state: { message: "Sign in to complete your ticket booking." }
      });
      return;
    }
    navigate("/boarding-dropping");
  }

  function renderSeat(seat) {
    const state = getSeatState(seat, selected);
    return (
      <button
        key={seat.id}
        className={`seat ${state}`}
        onClick={() => toggleSeat(seat)}
        title={`Seat ${seat.seat_no} — ${state.replace("_", " ")}`}
        disabled={state === "booked"}
      >
        <span className="seat-no">{seat.seat_no.replace("S", "")}</span>
      </button>
    );
  }

  return (
    <div className="page">
      <BookingStepper current="seats" />

      <div className="seat-selection-container">
        <div className="selection-header">
          <Link to={`/bus/${plateNo}`} className="back-link"><FaChevronLeft /> Back to bus details</Link>
          <h2>Select Your Seats</h2>
          <p className="bus-subtext">{plateNo} · {journeyDate} · {busInfo ? `${busInfo.source} → ${busInfo.destination}` : ""}</p>
        </div>

        <div className="selection-content">
          <div className="card bus-layout-card">
            <div className="bus-front">
              <div className="bus-front-label">FRONT</div>
              <div className="driver-area">
                <div className="steering-wheel" />
                <div className="driver-seat">
                  <FaUserCircle size={20} />
                </div>
              </div>
            </div>

            <div className="seat-layout">
              <div className="seat-row-labels">
                <span>Window</span>
                <span>Aisle</span>
                <span>Aisle</span>
                <span>Window</span>
              </div>

              {seatRows.map((row, rowIdx) => (
                <div className="seat-row" key={rowIdx}>
                  <div className="seat-pair left">
                    {row[0] && renderSeat(row[0])}
                    {row[1] && renderSeat(row[1])}
                  </div>
                  <div className="bus-aisle">
                    <span className="aisle-label">{rowIdx + 1}</span>
                  </div>
                  <div className="seat-pair right">
                    {row[2] && renderSeat(row[2])}
                    {row[3] && renderSeat(row[3])}
                  </div>
                </div>
              ))}
            </div>

            <div className="bus-rear">
              <span>REAR ENTRANCE</span>
            </div>
          </div>

          <div className="selection-sidebar">
            <div className="card legend-card">
              <h3>Seat Legend</h3>
              <div className="legend-items">
                <div className="legend-item"><span className="seat available mini" /> Available</div>
                <div className="legend-item"><span className="seat selected mini" /> Selected</div>
                <div className="legend-item"><span className="seat booked mini" /> Booked</div>
                <div className="legend-item"><span className="seat female_reserved mini" /> Ladies Only</div>
              </div>
            </div>

            <div className="card summary-card sticky-summary">
              <h3>Booking Summary</h3>
              <div className="summary-row">
                <span>Selected Seats</span>
                <span className="summary-value">
                  {selected.map((id) => seats.find((s) => s.id === id)?.seat_no).join(", ") || "None"}
                </span>
              </div>
              <div className="summary-row">
                <span>Per Seat</span>
                <span className="summary-value">₹120</span>
              </div>
              <div className="summary-row total">
                <span>Total Amount</span>
                <span className="summary-value">₹{total}</span>
              </div>
              <button
                className="btn btn-full"
                disabled={!selected.length}
                onClick={proceed}
              >
                Continue to Stops
              </button>
              <p className="extra-info"><FaInfoCircle /> 2+2 seating with centre aisle — tap available seats to select.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
