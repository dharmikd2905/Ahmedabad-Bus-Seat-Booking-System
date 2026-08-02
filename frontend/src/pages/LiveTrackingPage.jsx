import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import L from "leaflet";
import api from "../services/api";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function LiveTrackingPage() {
  const [searchParams] = useSearchParams();
  const [busId, setBusId] = useState(searchParams.get("plate") || "");
  const [tracking, setTracking] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [animPos, setAnimPos] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    if (!busId) {
      setError("Please enter a Plate Number to search.");
      setTracking(null);
      setRouteCoords([]);
      setAnimPos(null);
      return;
    }
    try {
      const { data } = await api.get(`/tracking/${busId}`);
      setTracking(data);
      setError("");

      if (data.latitude && data.longitude && data.waypoint_1_lat && data.waypoint_1_long) {
        // Fetch OSRM route to trace accurate road coordinates between current pos and next waypoint
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${data.longitude},${data.latitude};${data.waypoint_1_long},${data.waypoint_1_lat}?overview=full&geometries=geojson`;
        const osrmRes = await fetch(osrmUrl);
        const osrmData = await osrmRes.json();
        
        if (osrmData.routes && osrmData.routes.length > 0) {
          const coords = osrmData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoords(coords);
          setAnimPos(coords[0]);
        } else {
          setRouteCoords([]);
          setAnimPos([Number(data.latitude), Number(data.longitude)]);
        }
      } else if (data.latitude && data.longitude) {
        setRouteCoords([]);
        setAnimPos([Number(data.latitude), Number(data.longitude)]);
      }
    } catch {
      setError("No tracking data found for this Plate Number. Please verify.");
      setTracking(null);
      setRouteCoords([]);
      setAnimPos(null);
    }
  }

  // Effect to animate the bus marker across the fetched road polyline realistically
  useEffect(() => {
    if (!routeCoords.length) return;
    let step = 0;
    const totalSteps = routeCoords.length;
    const interval = setInterval(() => {
      step++;
      if (step < totalSteps) {
        setAnimPos(routeCoords[step]);
      } else {
        step = 0; // Loop back for demonstration
        setAnimPos(routeCoords[0]);
      }
    }, 1000); // 1-second transition tick between map edges
    return () => clearInterval(interval);
  }, [routeCoords]);

  // Hook to keep map bound centered to vehicle
  const mapCenter = useMemo(() => {
    if (animPos) return animPos;
    if (tracking?.latitude && tracking?.longitude) return [Number(tracking.latitude), Number(tracking.longitude)];
    return [23.0225, 72.5714]; // Default Ahmedabad Center
  }, [tracking, animPos]);

  return (
    <div className="page">
      <div className="card">
        <h3>Live Bus Tracking by Plate Number</h3>
        <input 
          placeholder="Enter plate number (e.g., GJ-01-CZ-1120)" 
          value={busId} 
          onChange={(e) => setBusId(e.target.value)} 
          style={{ padding: "8px", width: "250px", marginRight: "10px" }}
        />
        <button className="btn" onClick={load}>Search Map</button>
        {error ? <p className="error" style={{color: "red", marginTop: "10px"}}>{error}</p> : null}
        
        {tracking ? (
          <div style={{ marginTop: "15px" }}>
            <p><strong>Plate:</strong> {tracking.plate_no} | <strong>Route:</strong> {tracking.route_no} | <strong>Destination:</strong> {tracking.destination}</p>
            <p><strong>Current location:</strong> {tracking.current_location_text || "Not updated"}</p>
            <p><strong>Coordinates:</strong> {tracking.latitude}, {tracking.longitude}</p>
            <p><strong>ETA:</strong> {tracking.eta_minutes || "N/A"} mins</p>
            <p><strong>Moving Toward:</strong> {tracking.moving_toward || "N/A"}</p>
            <p><strong>Status:</strong> {tracking.status_text || "Not updated"}</p>
          </div>
        ) : null}
      </div>
      
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: "460px", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routeCoords.length > 0 && <Polyline positions={routeCoords} color="blue" weight={5} opacity={0.6} />}
          {tracking && animPos && (
            <Marker position={animPos} icon={icon}>
              <Popup>
                <strong>{tracking.plate_no}</strong><br />
                Route: {tracking.route_no}<br />
                Destination: {tracking.destination}<br />
                Moving Toward: {tracking.moving_toward || "N/A"}<br />
                Status: {tracking.status_text || "N/A"}<br />
                ETA: {tracking.eta_minutes || "N/A"} mins
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
