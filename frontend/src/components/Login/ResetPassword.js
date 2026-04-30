import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../services/authService";
import { isStrongPassword } from "../../utils/validators";
import "./PasswordReset.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");
    setError("");

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError("Password must have at least 8 characters, one uppercase letter and one number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setStatus(result.message || "Password reset successfully. You can now log in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <p className="reset-eyebrow">Secure Reset</p>
        <h1>Choose a new password</h1>
        <p className="reset-copy">
          Set a new password for your Cityscape account. The reset link can only be used once.
        </p>

        <form onSubmit={handleSubmit} className="password-reset-form">
          <label>New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />

          <label>Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            required
          />

          {status && <div className="reset-message success">{status}</div>}
          {error && <div className="reset-message error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save new password"}
          </button>
        </form>

        <button type="button" className="reset-secondary" onClick={() => navigate("/login")}>
          Back to login
        </button>
      </section>
    </main>
  );
}
