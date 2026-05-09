import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function FeedbackForm({ reservation, status }) {
  const [overall, setOverall] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [service, setService] = useState(0);
  const [theme, setTheme] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Nu permite review dacă statusul nu e completed
  if (status !== "completed") {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", background: "#fff", borderRadius: 18, boxShadow: "0 4px 24px #0001", padding: 32, textAlign: "center" }}>
        <h2 style={{ color: "#111418", fontWeight: 900 }}>Feedback unavailable</h2>
        <p style={{ color: "#617589" }}>You can only submit feedback after your stay is completed.</p>
        <button style={{ background: "#1f2937", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, fontSize: 16, marginTop: 24, cursor: "pointer" }} onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!overall || !cleanliness || !service || !theme) {
      setError("Please rate all categories.");
      return;
    }
    if (text.trim().length < 10) {
      setError("Please write at least 10 characters in your comment.");
      return;
    }
    // Calculează media ratingurilor ca serviceRating (string, ex: "4.5")
    const serviceRating = ((Number(overall) + Number(cleanliness) + Number(service) + Number(theme)) / 4).toFixed(1);
    // Ia ClientId din localStorage sau context (presupunem localStorage)
    let ClientId = null;
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user && user.ClientId) ClientId = user.ClientId;
    } catch {}
    if (!ClientId && reservation.ClientId) ClientId = reservation.ClientId;
    if (!ClientId) {
      setError("Could not determine user. Please log in again.");
      return;
    }
    try {
      await axios.post(`/api/feedback`, {
        ReservationId: reservation.ReservationId || reservation.reservationId,
        serviceRating,
        submissionDate: new Date(),
        ClientId,
        overall,
        cleanliness,
        service,
        theme,
        comment: text.trim(),
      }, { withCredentials: true });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit feedback. Please try again later.");
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", background: "#fff", borderRadius: 18, boxShadow: "0 4px 24px #0001", padding: 32 }}>
      <h1 style={{ fontWeight: 900, fontSize: 32, marginBottom: 8 }}>Your experience matters.</h1>
      <p style={{ color: "#617589", marginBottom: 32 }}>Tell us about your recent stay at Cityscape Hotel</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontWeight: 700, fontSize: 20 }}>How was your overall stay?</h3>
          <StarRating value={overall} onChange={setOverall} />
        </div>
        <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div>Cleanliness</div>
            <StarRating value={cleanliness} onChange={setCleanliness} />
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div>Service</div>
            <StarRating value={service} onChange={setService} />
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div>Theme Accuracy</div>
            <StarRating value={theme} onChange={setTheme} />
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <textarea
            style={{ width: "100%", minHeight: 80, borderRadius: 10, border: "1px solid #eee", padding: 12, fontSize: 16 }}
            maxLength={500}
            placeholder="What did you love? What could we improve?"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div style={{ textAlign: "right", color: "#bdbdbd", fontSize: 13 }}>{text.length}/500</div>
        </div>
        {error && <div style={{ color: "#e11d48", marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ color: "#047857", marginBottom: 16 }}>Thank you for your feedback!</div>}
        <button type="submit" style={{ background: "#1f2937", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 18, width: "100%", marginTop: 8, cursor: "pointer" }}>Submit Review ➤</button>
      </form>
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div style={{ fontSize: 32, color: "#fbbf24", cursor: "pointer" }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} onClick={() => onChange(star)} style={{ opacity: value >= star ? 1 : 0.3 }}>&#9733;</span>
      ))}
    </div>
  );
}
