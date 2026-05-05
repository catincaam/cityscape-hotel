import { Navigate, useLocation } from "react-router-dom";

/**
 * Protejează rutele care necesită autentificare
 * Dacă nu există token → redirect la /login
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    const requestedPath = `${location.pathname}${location.search || ""}`;
    if (requestedPath && requestedPath !== "/login") {
      sessionStorage.setItem("postLoginRedirect", requestedPath);
    }

    return <Navigate to="/login" replace />;
  }

  return children;
}
