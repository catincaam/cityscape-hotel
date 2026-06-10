import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../../services/authService";
import "./PasswordReset.css";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let cancelled = false;

    async function confirmEmail() {
      if (!token) {
        setError("Verification token is missing.");
        setLoading(false);
        return;
      }

      try {
        const result = await verifyEmail(token);
        if (!cancelled) {
          setStatus(result.message || "Email verified successfully. You can now log in.");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    confirmEmail();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <p className="reset-eyebrow">Email Verification</p>
        <h1>Confirm your account</h1>
        <p className="reset-copy">
          We are verifying your Cityscape Hotel email address. You can sign in after confirmation.
        </p>

        {loading && <div className="reset-message success">Verifying email...</div>}
        {status && <div className="reset-message success">{status}</div>}
        {error && <div className="reset-message error">{error}</div>}

        <button type="button" className="reset-secondary" onClick={() => navigate("/login")}>
          Back to login
        </button>
      </section>
    </main>
  );
}
