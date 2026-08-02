import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

export default function BusDetailsPage() {
  const { plateNo } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/buses/plate/${plateNo}`).then((res) => setData(res.data));
  }, [plateNo]);

  if (!data) return <div className="page">Loading details...</div>;

  return (
    <div className="page">
      <div className="card">
        <h2>{data.plate_no}</h2>
        <p>{data.source} to {data.destination}</p>
        <p>Route: {data.route_no} | Status: {data.status_text || "N/A"} | Toward: {data.moving_toward || "N/A"}</p>
        <p>ETA: {data.eta_to_next_stop_mins || "N/A"} mins | Fare leg: {data.current_fare_leg || "N/A"}</p>
        <p>Stops: {(data.stops || []).map((s) => s.stop_name).join(" -> ") || "Not available"}</p>
        <Link to={`/bus/${encodeURIComponent(plateNo)}/seats`} className="btn">Select Seats</Link>
      </div>
    </div>
  );
}
