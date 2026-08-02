import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaMapMarkerAlt, FaChevronLeft, FaArrowDown } from "react-icons/fa";
import { useToast } from "../components/Toast";

export default function BoardDropPage() {
  const [options, setOptions] = useState({ boarding: [], dropping: [] });
  const [form, setForm] = useState({ boardingPoint: "", droppingPoint: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const draft = JSON.parse(sessionStorage.getItem("bookingDraft") || "{}");
    const busInfo = draft.busInfo || {};
    const stops = busInfo.stops || [];
    const stopNames = stops
      .map((s) => (typeof s === "string" ? s : s.stop_name))
      .filter(Boolean); // remove empty strings
    setOptions({ boarding: stopNames, dropping: stopNames });
  }, []);

  const availableDropping = form.boardingPoint 
    ? options.dropping.slice(options.boarding.indexOf(form.boardingPoint) + 1)
    : options.dropping;

  function nextStep() {
    if (!form.boardingPoint || !form.droppingPoint) {
      setError("Please select both points.");
      toast("Select both boarding and dropping points", "error");
      return;
    }
    setError("");
    const draft = JSON.parse(sessionStorage.getItem("bookingDraft") || "{}");
    sessionStorage.setItem("bookingDraft", JSON.stringify({ ...draft, ...form }));
    navigate("/passenger");
  }

  return (
    <div className="page">
      <div className="selection-header">
        <Link to="/results" className="back-link"><FaChevronLeft /> Back to Results</Link>
        <h2>Almost There</h2>
        <p className="bus-subtext">Choose your exact boarding and dropping locations.</p>
      </div>

      <div className="card point-selection-card">
        <div className="point-input-group">
          <div className="point-icon-line">
            <FaMapMarkerAlt className="marker start" />
            <div className="line"></div>
            <FaMapMarkerAlt className="marker end" />
          </div>
          
          <div className="point-fields">
            <div className="field-block">
              <label className="field-label">Boarding Station</label>
              <select 
                className="modern-select"
                value={form.boardingPoint} 
                onChange={(e) => {
                  setForm({ ...form, boardingPoint: e.target.value, droppingPoint: "" });
                }}
              >
                <option value="">Choose boarding point...</option>
                {options.boarding.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            
            <div className="field-block">
              <label className="field-label">Dropping Station</label>
              <select 
                className="modern-select"
                value={form.droppingPoint} 
                onChange={(e) => setForm({ ...form, droppingPoint: e.target.value })} 
                disabled={!form.boardingPoint}
              >
                <option value="">Choose dropping point...</option>
                {availableDropping.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
        
        {error && <p className="error-message">{error}</p>}
        
        <button className="btn btn-full" onClick={nextStep}>
          Passenger Details <FaArrowDown style={{ marginLeft: "8px" }} />
        </button>
      </div>
    </div>
  );
}
