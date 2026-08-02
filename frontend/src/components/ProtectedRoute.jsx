import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ isAuthenticated, children, message = "Please sign in to continue." }) {
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/auth?redirect=${redirect}`}
        state={{ message }}
        replace
      />
    );
  }
  return children;
}
