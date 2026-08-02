import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import api from "../services/api";
import AutocompleteSelect from "../components/AutocompleteSelect";

export default function HomePage({ setSearchState }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ source: "", destination: "" });
  const [stations, setStations] = useState([]);
  const [error, setError] = useState("");
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState("");

  useEffect(() => {
    api.get("/stations")
      .then((response) => setStations(response.data))
      .catch(() => setStationsError("Stations could not be loaded. Make sure the backend is running, then refresh."))
      .finally(() => setStationsLoading(false));
  }, []);

  const formattedToday = useMemo(() => new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  }).format(new Date()), []);

  function onSearch(event) {
    event.preventDefault();
    const sourceMatch = stations.some((name) => name.toLowerCase() === form.source.trim().toLowerCase());
    const destinationMatch = stations.some((name) => name.toLowerCase() === form.destination.trim().toLowerCase());
    if (!sourceMatch || !destinationMatch) {
      setError("Please choose both stops from the station list.");
      return;
    }
    setError("");
    setSearchState(form);
    navigate("/results");
  }

  return (
    <div className="page hero">
      <div className="badge-modern"><span className="pulse-dot" /> LIVE CITY TRAVEL</div>
      <h1>Move through Ahmedabad <br /><span>with confidence.</span></h1>
      <p className="hero-subtitle">Plan your route, choose a comfortable seat and keep every city journey simple.</p>
      <div className="today-container"><p className="today-line">Today: {formattedToday}</p></div>

      <div className="search-container journey-planner">
        <div className="planner-intro"><span>Plan a journey</span><small>Choose your stops to see available buses</small></div>
        <form className="card sticky-search" onSubmit={onSearch}>
          <div className="input-group">
            <FaMapMarkerAlt className="input-icon" />
            <AutocompleteSelect label="Source Station" options={stations} value={form.source}
              placeholder={stationsLoading ? "Loading stations..." : "From where?"} disabled={stationsLoading}
              onChange={(value) => setForm({ ...form, source: value })} />
          </div>
          <div className="input-group">
            <FaMapMarkerAlt className="input-icon" style={{ color: "var(--brand-2)" }} />
            <AutocompleteSelect label="Destination Station" options={stations} value={form.destination}
              placeholder={stationsLoading ? "Loading stations..." : "To where?"} disabled={stationsLoading}
              onChange={(value) => setForm({ ...form, destination: value })} />
          </div>
          <button className="btn search-btn" disabled={stationsLoading}><FaSearch /> Search buses</button>
          {error || stationsError ? <p className="error full-width">{error || stationsError}</p> : null}
        </form>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><h3>39</h3><p>Connected stations</p></div>
        <div className="stat-card"><h3>2+2</h3><p>Comfortable seating</p></div>
        <div className="stat-card"><h3>Live</h3><p>Booking updates</p></div>
      </div>
    </div>
  );
}
