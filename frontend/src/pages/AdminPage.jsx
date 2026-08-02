import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function AdminPage({ adminName, onAdminLogout }) {
  const toast = useToast();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [locationForms, setLocationForms] = useState({});

  // Per-card seat detail state: { [plateNo]: { open, loading, data, error } }
  const [seatPanels, setSeatPanels] = useState({});

  async function loadDashboard() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/today-buses");
      setBuses(data.buses || []);
    } catch {
      toast("Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function reloadDataset() {
    try {
      const { data } = await api.post("/admin/dataset/reload");
      toast(data.message || "Dataset reloaded", "success");
      await loadDashboard();
    } catch {
      toast("Failed to reload dataset", "error");
    }
  }

  function updateLocalLocationForm(plateNo, key, value) {
    setLocationForms((prev) => ({
      ...prev,
      [plateNo]: { ...(prev[plateNo] || {}), [key]: value },
    }));
  }

  async function updateTracking(plateNo) {
    try {
      const payload = locationForms[plateNo] || {};
      await api.put(`/admin/tracking/${encodeURIComponent(plateNo)}`, payload);
      toast(`Location updated for bus ${plateNo}`, "success");
      await loadDashboard();
    } catch {
      toast("Failed to update location", "error");
    }
  }

  async function toggleSeatPanel(plateNo) {
    const panel = seatPanels[plateNo] || {};

    // If already open, close it
    if (panel.open) {
      setSeatPanels((prev) => ({
        ...prev,
        [plateNo]: { open: false, loading: false, data: null, error: null },
      }));
      return;
    }

    // Open and start loading
    setSeatPanels((prev) => ({
      ...prev,
      [plateNo]: { open: true, loading: true, data: null, error: null },
    }));

    try {
      const { data } = await api.get(
        `/admin/buses/${encodeURIComponent(plateNo)}/details`
      );
      setSeatPanels((prev) => ({
        ...prev,
        [plateNo]: { open: true, loading: false, data, error: null },
      }));
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to load seat details";
      setSeatPanels((prev) => ({
        ...prev,
        [plateNo]: { open: true, loading: false, data: null, error: msg },
      }));
      toast(msg, "error");
    }
  }

  const filteredBuses = useMemo(() => {
    const clean = search.trim().toLowerCase();
    if (!clean) return buses;
    return buses.filter((bus) =>
      `${bus.plate_no || ""} ${bus.route_no || ""} ${bus.source || ""} ${bus.destination || ""}`
        .toLowerCase()
        .includes(clean)
    );
  }, [buses, search]);

  return (
    <div className="page">
      {/* ── Toolbar ── */}
      <div className="card admin-toolbar">
        <div>
          <h3>Admin Dashboard</h3>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            Welcome, {adminName || "Admin"} · {new Date().toDateString()}
          </p>
        </div>
        <div className="admin-actions">
          <button className="btn ghost" onClick={reloadDataset}>
            Reload Dataset
          </button>
          <button className="btn ghost" onClick={onAdminLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* ── Search + Bus List ── */}
      <div className="card">
        <input
          placeholder="Search by plate, route, source, destination…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {loading ? (
          <p style={{ color: "var(--muted)", textAlign: "center" }}>
            Loading buses…
          </p>
        ) : !filteredBuses.length ? (
          <p
            className="empty"
            style={{ padding: "40px 0" }}
          >
            No buses found.
          </p>
        ) : (
          <div className="admin-bus-list">
            {filteredBuses.map((bus) => {
              const panel = seatPanels[bus.plate_no] || {};
              const bookedSeats =
                panel.data?.seats?.filter((s) => s.seat_status === "BOOKED") || [];
              const totalSeats = panel.data?.seats?.length ?? 0;

              return (
                <div className="card admin-bus-card" key={bus.plate_no}>
                  {/* ── Bus Summary ── */}
                  <div className="admin-bus-summary">
                    <div>
                      <h4 style={{ margin: "0 0 4px" }}>
                        {bus.plate_no}
                        <span
                          style={{
                            marginLeft: 10,
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--muted)",
                          }}
                        >
                          Route {bus.route_no}
                        </span>
                      </h4>
                      <p style={{ margin: "2px 0", fontSize: 14 }}>
                        {bus.source} → {bus.destination}
                      </p>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
                      <span>
                        Status:{" "}
                        <strong>{bus.trip_status || "Not updated"}</strong>
                      </span>
                      <br />
                      <span>
                        Next stop: <strong>{bus.next_stop || "N/A"}</strong>
                      </span>
                      {" · "}
                      <span>
                        ETA: <strong>{bus.eta_minutes ?? bus.eta_to_next_stop_mins ?? "N/A"} min</strong>
                      </span>
                      <br />
                      <span>
                        Speed: <strong>{bus.speed_kmph ?? "N/A"} km/h</strong>
                      </span>
                      {" · "}
                      <span>
                        Seats:{" "}
                        <strong>
                          {bus.booked_count ?? 0}/{bus.seat_count ?? 40} booked
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* ── View Seat Details Button ── */}
                  <div className="admin-card-actions">
                    <button
                      className="btn"
                      onClick={() => toggleSeatPanel(bus.plate_no)}
                      style={{ fontSize: 13, padding: "8px 14px" }}
                    >
                      {panel.open ? "Hide Seat Details" : "View Seat Details"}
                    </button>
                  </div>

                  {/* ── Seat Detail Panel ── */}
                  {panel.open && (
                    <div className="admin-seat-panel">
                      {panel.loading && (
                        <p style={{ color: "var(--muted)", fontSize: 14 }}>
                          Loading seat details…
                        </p>
                      )}
                      {panel.error && (
                        <p className="error">{panel.error}</p>
                      )}
                      {panel.data && !panel.loading && (
                        <>
                          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
                            Journey date: <strong>{panel.data.journeyDate}</strong>
                            {" · "}
                            Total seats: <strong>{totalSeats}</strong>
                            {" · "}
                            Booked: <strong>{bookedSeats.length}</strong>
                            {" · "}
                            Available: <strong>{totalSeats - bookedSeats.length}</strong>
                          </p>

                          {bookedSeats.length === 0 ? (
                            <p
                              style={{
                                background: "#f0fdf4",
                                border: "1px solid #86efac",
                                borderRadius: 10,
                                padding: "14px 16px",
                                fontSize: 14,
                                color: "#166534",
                              }}
                            >
                              ✓ No seat bookings found for this bus today.
                            </p>
                          ) : (
                            <div className="admin-seat-grid">
                              {bookedSeats.map((seat) => (
                                <div
                                  className="admin-seat-card booked"
                                  key={seat.seat_id}
                                >
                                  <p
                                    style={{
                                      margin: "0 0 6px",
                                      fontWeight: 700,
                                      fontSize: 15,
                                    }}
                                  >
                                    Seat {seat.seat_no}
                                    <span
                                      style={{
                                        marginLeft: 8,
                                        fontSize: 11,
                                        fontWeight: 500,
                                        background: "#fca5a5",
                                        padding: "2px 7px",
                                        borderRadius: 999,
                                      }}
                                    >
                                      BOOKED
                                    </span>
                                  </p>
                                  <p style={{ margin: "3px 0", fontSize: 13 }}>
                                    👤 <strong>{seat.passenger_name || "N/A"}</strong>
                                  </p>
                                  <p style={{ margin: "3px 0", fontSize: 13 }}>
                                    📞 {seat.passenger_phone || "N/A"}
                                  </p>
                                  <p style={{ margin: "3px 0", fontSize: 13 }}>
                                    🚏 {seat.boarding_point || "N/A"} →{" "}
                                    {seat.dropping_point || "N/A"}
                                  </p>
                                  <p
                                    style={{
                                      margin: "3px 0",
                                      fontSize: 11,
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {seat.booking_status || "CONFIRMED"} ·{" "}
                                    {String(seat.booking_created_at || "")
                                      .slice(0, 16)
                                      .replace("T", " ")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Available seats count only — no individual cards for clutter */}
                          {totalSeats - bookedSeats.length > 0 && (
                            <p
                              style={{
                                marginTop: 10,
                                fontSize: 13,
                                color: "var(--muted)",
                              }}
                            >
                              + {totalSeats - bookedSeats.length} seats available
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Location Update Form ── */}
                  <details style={{ marginTop: 12 }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--brand)",
                        listStyle: "none",
                        padding: "6px 0",
                      }}
                    >
                      ▸ Update Location
                    </summary>
                    <div
                      className="admin-location-grid"
                      style={{ marginTop: 10 }}
                    >
                      <input
                        placeholder="Current location text"
                        onChange={(e) =>
                          updateLocalLocationForm(
                            bus.plate_no,
                            "currentLocation",
                            e.target.value
                          )
                        }
                      />
                      <input
                        placeholder="Next stop"
                        onChange={(e) =>
                          updateLocalLocationForm(
                            bus.plate_no,
                            "nextStop",
                            e.target.value
                          )
                        }
                      />
                      <input
                        placeholder="ETA (minutes)"
                        type="number"
                        onChange={(e) =>
                          updateLocalLocationForm(
                            bus.plate_no,
                            "etaMinutes",
                            Number(e.target.value)
                          )
                        }
                      />
                      <input
                        placeholder="Trip status (On Time / Delayed / Arriving)"
                        onChange={(e) =>
                          updateLocalLocationForm(
                            bus.plate_no,
                            "statusText",
                            e.target.value
                          )
                        }
                      />
                      <input
                        placeholder="Latitude (optional)"
                        type="number"
                        step="any"
                        onChange={(e) =>
                          updateLocalLocationForm(
                            bus.plate_no,
                            "latitude",
                            Number(e.target.value)
                          )
                        }
                      />
                      <input
                        placeholder="Longitude (optional)"
                        type="number"
                        step="any"
                        onChange={(e) =>
                          updateLocalLocationForm(
                            bus.plate_no,
                            "longitude",
                            Number(e.target.value)
                          )
                        }
                      />
                      <button
                        className="btn"
                        style={{
                          gridColumn: "1 / -1",
                          maxWidth: 220,
                          fontSize: 13,
                        }}
                        onClick={() => updateTracking(bus.plate_no)}
                      >
                        Save Location Update
                      </button>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
