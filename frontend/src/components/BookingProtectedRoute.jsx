import { Navigate, useLocation } from "react-router-dom";

// Keeps a selected-seat draft in session storage, while requiring an account
// before a user enters the parts of the flow that create a ticket.
export default function BookingProtectedRoute({ isAuthenticated, children }) {
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/auth?redirect=${redirect}`}
        state={{ message: "Sign in or create an account to complete your ticket booking." }}
        replace
      />
    );
  }

  return children;
}
