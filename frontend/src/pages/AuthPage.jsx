import { useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock, FaBus, FaArrowRight, FaInfoCircle } from "react-icons/fa";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function AuthPage({ setAuthState }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const toast = useToast();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");

  const redirectTo = searchParams.get("redirect") || "/";
  const infoMessage = location.state?.message || (redirectTo.includes("passenger") || redirectTo.includes("boarding") ? "Sign in to complete your ticket booking." : "");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const { data } = await api.post(path, form);
      const userName = data.user.full_name || data.user.fullName || "";
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("userName", userName);
      setAuthState({ token: data.token, userName, userRole: data.user.role });

      toast(mode === "login" ? "Welcome back!" : "Account created successfully", "success");
      navigate(decodeURIComponent(redirectTo));
    } catch (requestError) {
      const errMessage = requestError.response?.data?.message || requestError.response?.data?.errors?.[0]?.msg || "Authentication failed.";
      setError(errMessage);
      toast(errMessage, "error");
    }
  }

  return (
    <div className="page auth-page-container">
      <div className="auth-card-wrapper">
        <div className="auth-branding">
          <div className="auth-logo">
            <FaBus />
          </div>
          <h2>{mode === "login" ? "Welcome Back" : "Join Ahmedabad Bus"}</h2>
          <p>{mode === "login" ? "Login to access your bookings and track buses in real-time." : "Create an account to start booking your city travel today."}</p>
        </div>

        <form className="card auth-card" onSubmit={submit}>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

          {infoMessage && (
            <div className="auth-info-banner">
              <FaInfoCircle /> {infoMessage}
            </div>
          )}

          <div className="auth-fields">
            {mode === "signup" && (
              <div className="input-group-modern">
                <FaUser className="input-icon-modern" />
                <input
                  placeholder="Full Name"
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="input-group-modern">
              <FaEnvelope className="input-icon-modern" />
              <input
                type="email"
                placeholder="Email Address"
                required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="input-group-modern">
              <FaLock className="input-icon-modern" />
              <input
                type="password"
                placeholder="Password"
                required
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button className="btn btn-full auth-submit">
            {mode === "login" ? "Sign In" : "Create Account"} <FaArrowRight />
          </button>

          <p className="auth-footer">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              className="link-btn"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Sign up now" : "Log in here"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
