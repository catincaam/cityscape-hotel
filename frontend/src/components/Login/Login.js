import React, { useState } from "react";
import bgImage from "../../assets/landingpagePhoto.jpg";
import { login, register } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
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

        // 🔥 MAGIC HAPPENS HERE:
        // if login succeeded, redirect to the appropriate page
        if (isAdminMode) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } 
      else {

        if (form.parola !== form.confirmParola) {
          alert("Passwords do not match");
          return;
        }

        await register({
          firstName: form.prenume,
          lastName: form.nume,
          email: form.email,
          password: form.parola,
          typeClientTip: "Standard",
        });

        alert("Account created! You can now log in.");
        setMode("login");
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      // Send token to backend for authentication
      const res = await axios.post("http://localhost:9001/api/auth/google", {
        token: credentialResponse.credential,
      });
      // Save JWT and user info (you can use localStorage/sessionStorage)
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.client.ClientId);
      // Redirect to dashboard or main page with a personalized message
      if (res.data.client.TypeClientTip === "Admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      alert("Google login failed!");
    }
  }

  function handleGoogleError() {
    alert("Google login failed!");
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
              Discover the world <br /> in a single room.
            </h2>

            <p className="hero-description">
              From the tranquility of Kyoto’s temples to the energy of New York’s streets.
              Book themed rooms and enjoy the complete experience.
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
              <p className="rating-text">Happy travelers worldwide</p>
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
            {isAdminMode ? "👤 User" : "🔐 Admin"}
          </button>

          {/* Header */}
          <div className="form-header">
            <h2 className="form-title">Welcome{isAdminMode ? " Admin" : ""}!</h2>
            <p className="form-subtitle">
              {mode === "login"
                ? "Log in to continue your journey."
                : "Fill in the details to create your account."}
            </p>
          </div>

          {/* Tabs */}
          <div className="tabs-modern">
            <button
              className={`tab ${mode === "login" ? "active" : ""}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`tab ${mode === "register" ? "active" : ""}`}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "register" && (
              <>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-input"
                    name="nume"
                    placeholder="Doe"
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    className="form-input"
                    name="prenume"
                    placeholder="John"
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
                placeholder="name@example.com"
                onChange={handleChange}
                value={form.email}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label className="form-label">Password</label>
                {mode === "login" && (
                  <button type="button" className="forgot-link" onClick={() => alert('Feature coming soon')}>
                    Forgot your password?
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
                <label className="form-label">Confirm password</label>
                <input
                  className="form-input"
                  name="confirmParola"
                  type="password"
                  placeholder="Re-enter password"
                  onChange={handleChange}
                  value={form.confirmParola}
                  required
                />
              </div>
            )}

            <button type="submit" className="submit-btn">
              {mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="switch-mode">
            <p>
              {mode === "login" ? (
                <>
                  Don’t have an account?{" "}
                  <span className="switch-link" onClick={() => setMode("register")}> 
                    Sign up
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="switch-link" onClick={() => setMode("login")}> 
                    Log in
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Divider */}
          <div className="divider-section">
            <div className="divider-line" />
            <span className="divider-text">OR</span>
            <div className="divider-line" />
          </div>

          {/* Social Login */}
          <div className="social-buttons">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="footer-modern">
          <p>© 2025 Cityscape Hotel. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
