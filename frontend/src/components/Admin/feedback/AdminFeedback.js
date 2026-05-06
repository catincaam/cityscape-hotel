import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Search, Star } from "lucide-react";
import { API_BASE_URL } from "../../../config/runtimeUrls";
import defaultProfilePicture from "../../../assets/profilePicture.jpg";
import "./AdminFeedback.css";

function getClientName(feedback) {
  const client = feedback.Client;
  if (!client) return "Guest";
  return `${client.FirstName || ""} ${client.LastName || ""}`.trim() || "Guest";
}

function getRating(feedback) {
  return Number(feedback.overall || feedback.service || feedback.cleanliness || feedback.theme || 0);
}

function resolveProfilePicture(value) {
  if (!value || typeof value !== "string") return defaultProfilePicture;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/assets/")) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return value;
}

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    axios.get("/api/feedback")
      .then((res) => {
        setFeedback(Array.isArray(res.data) ? res.data : []);
        setError("");
      })
      .catch((err) => {
        console.error("Admin feedback error", err);
        setError("Could not load feedback.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return feedback;

    return feedback.filter((item) => {
      const name = getClientName(item).toLowerCase();
      const email = item.Client?.Email?.toLowerCase() || "";
      const comment = item.comment?.toLowerCase() || "";
      const reservation = String(item.ReservationId || item.Reservation?.ReservationId || "");
      return name.includes(term) || email.includes(term) || comment.includes(term) || reservation.includes(term);
    });
  }, [feedback, search]);

  return (
    <div className="admin-feedback-page">
      <section className="admin-feedback-hero">
        <div>
          <p>Guest Voice</p>
          <h2>Feedback Archive</h2>
          <span>{feedback.length} reviews collected</span>
        </div>
        <div className="admin-feedback-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search feedback..."
          />
        </div>
      </section>

      {error && <div className="admin-feedback-error">{error}</div>}

      {loading ? (
        <div className="admin-feedback-empty">Loading feedback...</div>
      ) : filtered.length ? (
        <div className="admin-feedback-grid">
          {filtered.map((item) => {
            const rating = getRating(item);
            const clientName = getClientName(item);
            const profilePicture = resolveProfilePicture(item.Client?.profilePicture);
            const reservationId = item.ReservationId || item.Reservation?.ReservationId;
            const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A";

            return (
              <article className="admin-feedback-card" key={item.id}>
                <div className="admin-feedback-card-top">
                  <div className="admin-feedback-avatar">
                    <img
                      src={profilePicture}
                      alt={clientName}
                      onError={(event) => { event.currentTarget.src = defaultProfilePicture; }}
                    />
                  </div>
                  <div>
                    <h3>{clientName}</h3>
                    <p>{item.Client?.Email || "No email"}</p>
                  </div>
                  <div className="admin-feedback-score">
                    <Star size={15} />
                    {rating.toFixed(1)}
                  </div>
                </div>

                <p className="admin-feedback-comment">"{item.comment || "No written comment."}"</p>

                <div className="admin-feedback-ratings">
                  <span>Overall <strong>{item.overall || "-"}</strong></span>
                  <span>Cleanliness <strong>{item.cleanliness || "-"}</strong></span>
                  <span>Service <strong>{item.service || "-"}</strong></span>
                  <span>Theme <strong>{item.theme || "-"}</strong></span>
                </div>

                <footer>
                  <span>Reservation #{reservationId || "-"}</span>
                  <span>{date}</span>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-feedback-empty">No feedback found.</div>
      )}
    </div>
  );
}
