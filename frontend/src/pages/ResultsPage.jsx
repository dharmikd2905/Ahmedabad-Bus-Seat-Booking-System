import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaBus, FaRoute, FaCheckCircle, FaChevronRight, FaMapMarkerAlt } from "react-icons/fa";
import api from "../services/api";

export default function ResultsPage({ searchState }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterRoute, setFilterRoute] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get("/buses/search", {
          params: { source: searchState.source, destination: searchState.destination },
        });
        setRows(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchState.source, searchState.destination]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => !filterRoute || r.route_no?.includes(filterRoute)
      ),
    [rows, filterRoute]
  );

  if (loading) return (
    <div className="page" style={{ textAlign: "center", padding: "100px" }}>
      <div className="loader"></div>
      <p style={{ marginTop: "20px", color: "var(--muted)" }}>Finding best buses for you...</p>
    </div>
  );

  if (!filtered.length)
    return (
      <div className="page empty">
        <FaBus size={48} style={{ marginBottom: "20px", opacity: 0.2 }} />
        <h2>No buses found</h2>
        <p>Try searching for a different route or station.</p>
        <Link to="/" className="btn ghost" style={{ marginTop: "20px" }}>Go Back</Link>
      </div>
    );

  return (
    <div className="page">
      <div className="results-header">
        <h1>Available Buses</h1>
        <p>{searchState.source} <FaChevronRight size={12} /> {searchState.destination}</p>
      </div>

      <div className="filters card">
        <div style={{ position: "relative" }}>
          <FaRoute style={{ position: "absolute", left: "12px", top: "14px", color: "var(--muted)" }} />
          <input
            style={{ paddingLeft: "38px" }}
            placeholder="Filter by route number (e.g. 101)"
            value={filterRoute}
            onChange={(e) => setFilterRoute(e.target.value)}
          />
        </div>
      </div>

      <div className="results-list">
        {filtered.map((bus) => (
          <div className="card bus-card-modern" key={bus.plate_no}>
            <div className="bus-main-info">
              <div className="bus-icon-circle">
                <FaBus />
              </div>
              <div className="bus-details">
                <div className="bus-header-row">
                  <h3>{bus.plate_no}</h3>
                  <span className="route-badge">Route {bus.route_no}</span>
                </div>
                <div className="route-flow">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FaMapMarkerAlt size={12} style={{ color: "var(--brand)", flexShrink: 0 }} />
                    <span>{bus.source}</span>
                  </div>
                  <div className="dot-line"></div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FaMapMarkerAlt size={12} style={{ color: "var(--brand-2)", flexShrink: 0 }} />
                    <span>{bus.destination}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bus-actions-modern">
              <div className="seats-info">
                <span className="seats-count">{bus.seat_available ?? "N/A"}</span>
                <span className="seats-label">Seats Left</span>
              </div>
              <div className="action-buttons">
                <Link
                  className="btn"
                  to={`/bus/${encodeURIComponent(bus.plate_no)}`}
                >
                  <FaCheckCircle /> Book Now
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
