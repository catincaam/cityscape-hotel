import { useState } from "react";
import Navbar from "../Dashboard/Navbar";
import "./EmailTest.css";

export default function EmailTest() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleTest() {
    if (!email) {
      setMessage("❌ Introdu un email valid");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:9001/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ " + data.message);
      } else {
        setMessage("❌ " + (data.error || data.message));
      }
    } catch (err) {
      setMessage("❌ Eroare: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      
      <main className="email-test-page">
        <div className="test-card">
          <h1>🧪 Test Email System</h1>
          <p>Verifică dacă sistemul de email funcționează corect</p>

          <div className="test-form">
            <input
              type="email"
              placeholder="Introdu email-ul tău (ex: alex@yahoo.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="email-input"
            />

            <button 
              onClick={handleTest}
              disabled={loading}
              className="test-btn"
            >
              {loading ? "Se trimite..." : "Trimite Email Test"}
            </button>
          </div>

          {message && (
            <div className={`message ${message.startsWith("✅") ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <div className="instructions">
            <h3>📋 Pași Configurare:</h3>
            <ol>
              <li>
                <strong>Gmail:</strong> Generează App Password la{" "}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
                  myaccount.google.com/apppasswords
                </a>
              </li>
              <li>Adaugă în <code>backend/.env</code>:</li>
              <pre>
EMAIL_USER="taumail@gmail.com"{"\n"}
EMAIL_PASSWORD="app-password-16-chars"
              </pre>
              <li>Repornește backend-ul</li>
              <li>Testează email-ul aici!</li>
            </ol>
          </div>
        </div>
      </main>
    </>
  );
}
