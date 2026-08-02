import { FaSearch, FaBus, FaChair, FaMapMarkerAlt, FaUser, FaTicketAlt } from "react-icons/fa";

const STEPS = [
  { key: "search", label: "Search", icon: FaSearch },
  { key: "bus", label: "Select Bus", icon: FaBus },
  { key: "seats", label: "Seats", icon: FaChair },
  { key: "points", label: "Stops", icon: FaMapMarkerAlt },
  { key: "passenger", label: "Details", icon: FaUser },
  { key: "confirm", label: "Ticket", icon: FaTicketAlt },
];

export default function BookingStepper({ current = "search" }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="booking-stepper">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.key} className={`stepper-item ${done ? "done" : ""} ${active ? "active" : ""}`}>
            <div className="stepper-dot">
              <Icon size={12} />
            </div>
            <span className="stepper-label">{step.label}</span>
            {idx < STEPS.length - 1 && <div className="stepper-line" />}
          </div>
        );
      })}
    </div>
  );
}
