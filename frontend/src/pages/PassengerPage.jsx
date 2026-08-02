import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function PassengerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ passengerName: "", passengerPhone: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const draft = JSON.parse(sessionStorage.getItem("bookingDraft") || "{}");
      const payload = { ...draft, ...form };
      const { data } = await api.post("/bookings", payload);
      sessionStorage.setItem("bookingResult", JSON.stringify(data));
      toast("Booking completed successfully!", "success");
      navigate("/confirmation");
    } catch (err) {
      const msg = err.response?.data?.message || "Booking failed. Please login and retry.";
      if (err.response?.status === 401) {
        toast("Your session has ended. Please sign in to finish booking.", "info");
        navigate("/auth?redirect=%2Fpassenger", {
          state: { message: "Your session ended. Please sign in to finish booking." }
        });
        return;
      }
      setError(msg);
      toast(msg, "error");
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={submit}>
        <h3>Passenger Details</h3>
        <input placeholder="Passenger name" required onChange={(e) => setForm({ ...form, passengerName: e.target.value })} />
        <input placeholder="Phone" required onChange={(e) => setForm({ ...form, passengerPhone: e.target.value })} />
        {error ? <p className="error">{error}</p> : null}
        <button className="btn">Confirm Booking</button>
      </form>
    </div>
  );
}
