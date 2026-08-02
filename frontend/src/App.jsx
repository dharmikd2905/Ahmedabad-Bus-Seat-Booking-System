import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import BusDetailsPage from "./pages/BusDetailsPage";
import SeatSelectionPage from "./pages/SeatSelectionPage";
import BoardDropPage from "./pages/BoardDropPage";
import PassengerPage from "./pages/PassengerPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import AuthPage from "./pages/AuthPage";
import MyBookingsPage from "./pages/MyBookingsPage";

import AdminPage from "./pages/AdminPage";
import ProtectedRoute from "./components/ProtectedRoute";
import BookingProtectedRoute from "./components/BookingProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLoginPage from "./pages/AdminLoginPage";
import { useToast } from "./components/Toast";
import { FaBus, FaMapMarkedAlt, FaUser, FaClipboardList, FaSignOutAlt, FaUserShield } from "react-icons/fa";

export default function App() {
  const [searchState, setSearchState] = useState({ source: "", destination: "" });
  const [authState, setAuthState] = useState({
    token: localStorage.getItem("token"),
    userName: localStorage.getItem("userName") || "",
    userRole: localStorage.getItem("userRole") || ""
  });
  const [adminState, setAdminState] = useState({
    token: localStorage.getItem("adminToken"),
    name: localStorage.getItem("adminName") || "Admin"
  });
  const navigate = useNavigate();
  const toast = useToast();
  const isAuthenticated = Boolean(authState.token);
  const isAdminAuthenticated = Boolean(adminState.token);

  const displayName = useMemo(() => {
    return authState.userName || "";
  }, [authState.userName]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    setAuthState({ token: "", userName: "", userRole: "" });
    toast("Logged out successfully.", "info");
    navigate("/");
  }

  function adminLogout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    setAdminState({ token: "", name: "Admin" });
    toast("Admin logged out successfully.", "info");
    navigate("/admin/login");
  }

  return (
    <div>

      <nav className="navbar">
        <div className="brand">
          <FaBus /> <span>Ahmedabad CityBus</span>
        </div>
        <div className="nav-links">
          <NavLink to="/"><FaMapMarkedAlt /> Discover</NavLink>

          <NavLink to={isAdminAuthenticated ? "/admin" : "/admin/login"}>
            <FaUserShield /> Admin
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/my-bookings">
              <FaClipboardList /> My Bookings
            </NavLink>
          )}
          {!isAuthenticated ? (
            <NavLink to="/auth" className="login-link">
              <FaUser /> Login
            </NavLink>
          ) : (
            <div className="user-section">
              <span className="user-badge">
                <FaUser /> {displayName}
              </span>
              <button className="btn ghost logout-btn" onClick={logout} title="Logout">
                <FaSignOutAlt />
              </button>
            </div>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage setSearchState={setSearchState} />} />
        <Route path="/results" element={<ResultsPage searchState={searchState} />} />
        <Route path="/bus/:plateNo" element={<BusDetailsPage />} />
        <Route path="/bus/:plateNo/seats" element={<SeatSelectionPage />} />
        <Route
          path="/boarding-dropping"
          element={<BookingProtectedRoute isAuthenticated={isAuthenticated}><BoardDropPage /></BookingProtectedRoute>}
        />
        <Route
          path="/passenger"
          element={<BookingProtectedRoute isAuthenticated={isAuthenticated}><PassengerPage /></BookingProtectedRoute>}
        />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/auth" element={<AuthPage setAuthState={setAuthState} />} />
        <Route
          path="/my-bookings"
          element={(
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <MyBookingsPage />
            </ProtectedRoute>
          )}
        />

        <Route path="/admin/login" element={<AdminLoginPage setAdminState={setAdminState} />} />
        <Route
          path="/admin"
          element={(
            <AdminProtectedRoute isAuthenticated={isAdminAuthenticated}>
              <AdminPage adminName={adminState.name} onAdminLogout={adminLogout} />
            </AdminProtectedRoute>
          )}
        />
      </Routes>
    </div>
  );
}
