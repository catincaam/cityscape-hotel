import { Navigate } from "react-router-dom";

/**
 * Protejează rutele care necesită autentificare
 * Dacă nu există token → redirect la /login
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
