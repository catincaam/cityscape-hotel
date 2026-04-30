import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPasswordReset } from "../../services/authService";
import { isValidEmail } from "../../utils/validators";
import "./PasswordReset.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");
    setError("");
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);

    try {
      const result = await requestPasswordReset(email);
      setStatus(result.message || "If an account exists for this email, a reset link has been sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <p className="reset-eyebrow">Account Recovery</p>
        <h1>Reset your password</h1>
        <p className="reset-copy">
          Enter your account email and we will send a secure link for choosing a new password.
        </p>

        <form onSubmit={handleSubmit} className="password-reset-form">
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />

          {status && <div className="reset-message success">{status}</div>}
          {error && <div className="reset-message error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <button type="button" className="reset-secondary" onClick={() => navigate("/login")}>
          Back to login
        </button>
      </section>
    </main>
  );
}
