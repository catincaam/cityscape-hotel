import React, { useState } from "react";
import bgImage from "../../assets/landingpagePhoto.jpg";
import { login, register } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [mode, setMode] = useState("login"); // login | register
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    nume: "",
    prenume: "",
    email: "",
    parola: "",
    confirmParola: "",
  });

  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (mode === "login") {
        await login(form.email, form.parola);

        // 🔥 AICI e magia:
        // dacă login-ul a mers, schimbăm pagina
        if (isAdminMode) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } 
      else {
        if (form.parola !== form.confirmParola) {
          alert("Parolele nu coincid");
          return;
        }

        await register({
          firstName: form.prenume,
          lastName: form.nume,
          email: form.email,
          password: form.parola,
          typeClientTip: "Standard",
        });

        alert("Cont creat! Te poți autentifica.");
        setMode("login");
      }
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="login-container-modern">
      {/* LEFT SIDE - Hero Image */}
      <div className="login-left-modern">
        <div
          className="hero-background"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="hero-overlay" />
        
        <div className="hero-content">
          <div className="hero-header">
            <div className="hotel-icon floating-icon">
              <span className="icon-text">🏛️</span>
            </div>
            <h1 className="hotel-name">Cityscape Hotel</h1>
          </div>

          <h2 className="hero-title">
            Descoperă lumea <br /> dintr-o singură cameră.
          </h2>

          <p className="hero-description">
            De la liniștea templelor din Kyoto până la energia străzilor din New York. 
            Rezervă camere tematice și trăiește experiența completă.
          </p>

          {/* Social Proof - Avatars + Reviews */}
          <div className="social-proof">
            <div className="avatars-group">
              <img 
                className="avatar" 
                src="https://i.pravatar.cc/150?img=1" 
                alt="User 1" 
              />
              <img 
                className="avatar" 
                src="https://i.pravatar.cc/150?img=5" 
                alt="User 2" 
              />
              <img 
                className="avatar" 
                src="https://i.pravatar.cc/150?img=9" 
                alt="User 3" 
              />
              <div className="avatar-count">+2k</div>
            </div>

            <div className="proof-divider" />

            <div className="proof-rating">
              <div className="stars">
                <span className="star">⭐</span>
                <span className="star">⭐</span>
                <span className="star">⭐</span>
                <span className="star">⭐</span>
                <span className="star">⭐</span>
              </div>
              <p className="rating-text">Călători fericiți în toată lumea</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Form */}
      <div className="login-right-modern">
        <div className="decorative-blur blur-1" />
        <div className="decorative-blur blur-2" />

        <div className="form-card">
          {/* Secured Badge */}
          <div className="secured-badge">
            🔒 SECURED
          </div>

          {/* Admin Toggle */}
          <button 
            type="button"
            className="admin-toggle-modern"
            onClick={() => setIsAdminMode(!isAdminMode)}
          >
            {isAdminMode ? "👤 Utilizator" : "🔐 Admin"}
          </button>

          {/* Header */}
          <div className="form-header">
            <h2 className="form-title">Bine ați venit{isAdminMode ? " Admin" : ""}!</h2>
            <p className="form-subtitle">
              {mode === "login"
                ? "Autentifică-te pentru a continua călătoria."
                : "Completează detaliile pentru a crea contul."}
            </p>
          </div>

          {/* Tabs */}
          <div className="tabs-modern">
            <button
              className={`tab ${mode === "login" ? "active" : ""}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Autentificare
            </button>
            <button
              className={`tab ${mode === "register" ? "active" : ""}`}
              onClick={() => setMode("register")}
              type="button"
            >
              Înregistrare
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "register" && (
              <>
                <div className="form-group">
                  <label className="form-label">Nume</label>
                  <input
                    className="form-input"
                    name="nume"
                    placeholder="Popescu"
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prenume</label>
                  <input
                    className="form-input"
                    name="prenume"
                    placeholder="Ion"
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                name="email"
                type="email"
                placeholder="nume@exemplu.com"
                onChange={handleChange}
                value={form.email}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label className="form-label">Parolă</label>
                {mode === "login" && (
                  <button type="button" className="forgot-link" onClick={() => alert('Funcționalitate în lucru')}>
                    Ai uitat parola?
                  </button>
                )}
              </div>
              <div className="input-wrapper">
                <input
                  className="form-input-with-toggle"
                  name="parola"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  onChange={handleChange}
                  value={form.parola}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Confirmare parolă</label>
                <input
                  className="form-input"
                  name="confirmParola"
                  type="password"
                  placeholder="Reintrodu parola"
                  onChange={handleChange}
                  value={form.confirmParola}
                  required
                />
              </div>
            )}

            <button type="submit" className="submit-btn">
              {mode === "login" ? "Intră în cont" : "Creează cont"}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="switch-mode">
            <p>
              {mode === "login" ? (
                <>
                  Nu ai cont?{" "}
                  <span className="switch-link" onClick={() => setMode("register")}>
                    Înregistrează-te
                  </span>
                </>
              ) : (
                <>
                  Ai deja cont?{" "}
                  <span className="switch-link" onClick={() => setMode("login")}>
                    Intră în cont
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Divider */}
          <div className="divider-section">
            <div className="divider-line" />
            <span className="divider-text">SAU</span>
            <div className="divider-line" />
          </div>

          {/* Social Login */}
          <div className="social-buttons">
            <button type="button" className="social-btn">
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="social-icon"
              />
            </button>
            <button type="button" className="social-btn">
              <img 
                src="https://www.facebook.com/favicon.ico" 
                alt="Facebook" 
                className="social-icon"
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-modern">
          <p>© 2025 Cityscape Hotel. Toate drepturile rezervate.</p>
        </div>
      </div>
    </div>
  );
}
