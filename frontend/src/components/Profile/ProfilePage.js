import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Navbar from "../Dashboard/Navbar";
import profilePicture from "../../assets/profilePicture.jpg";
import { getDashboardData } from "../../services/dashboardService";
import "./ProfilePage.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        const data = await getDashboardData();
        setUserData(data);
      } catch (err) {
        console.error("Eroare la încărcarea datelor:", err);
      }
    }
    loadUserData();
  }, []);

  const user = {
    firstName: userData?.client?.FirstName || "User",
    lastName: userData?.client?.LastName || "",
    email: userData?.client?.Email || "user@email.com",
    level: "Explorer",
    points: userData?.cityPoints || 0,
    nextLevelPoints: 500,
    reservationsCount: userData?.recentReservations?.length || 0
  };

  const paidReservations = userData?.recentReservations || [];

  return (
    <>
      <Navbar />
      
      <main className="profile-page">
        {/* USER CARD */}
        <section className="user-card">
          <div className="user-info">
            <div className="avatar-large">
              <img src={profilePicture} alt="User Avatar" />
            </div>
            
            <div className="user-details">
              <h1>Salut, {user.firstName} {user.lastName} 👋</h1>
              <p className="user-meta">Membru {user.level} • {user.email}</p>
              <p className="user-tagline">Pregătit pentru următoarea aventură?</p>
            </div>
          </div>

          <button className="edit-profile-btn">
            Editează Profilul
          </button>
        </section>

        {/* RESERVATIONS LIST */}
        {paidReservations.length === 0 ? (
          <section className="empty-state">
            <div className="empty-icon">
              <span>🧳</span>
            </div>
            
            <h2>Nu ai încă nicio rezervare plătită</h2>
            <p>
              Aici vor apărea aventurile tale plătite. Descoperă camere tematice unice
              și finalizează prima ta rezervare.
            </p>

            <button className="discover-btn" onClick={() => window.location.href = '/explore'}>
              Descoperă Camerele
            </button>
          </section>
        ) : (
          <section className="reservations-section">
            <h2>Rezervările Tale</h2>
            <div className="reservations-list">
              {paidReservations.map((res) => (
                <div key={res.reservationId} className="reservation-card">
                  <div className="reservation-main">
                    <div className={`status-indicator ${res.status}`}></div>
                    
                    <div className="reservation-content">
                      <div className="reservation-header">
                        <div className="res-main-info">
                          <h3>{res.room}</h3>
                          <p className="res-city">{res.city}</p>
                        </div>
                        <span className={`booking-status-badge ${res.status}`}>
                          {res.status === 'active' ? '🟢 Active' : 
                           res.status === 'upcoming' ? '🔵 Upcoming' : 
                           '⚪ Past'}
                        </span>
                      </div>
                      
                      <div className="reservation-details">
                        <span className="res-id">#{res.reservationId}</span>
                        <span className="res-dates">
                          {new Date(res.checkIn).toLocaleDateString("ro-RO", { day: 'numeric', month: 'short' })} - 
                          {new Date(res.checkOut).toLocaleDateString("ro-RO", { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="res-amount">{res.totalAmount} RON</span>
                      </div>
                    </div>
                  </div>

                  <button className="details-btn" onClick={() => navigate(`/reservation/${res.reservationId}`)}>
                    Vezi Detalii →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GRID CARDS */}
        <div className="profile-grid">
          {/* GAMIFICATION CARD */}
          <div className="gamification-card">
            <div className="card-header">
              <h3>City Traveler</h3>
              <span className="level-badge">Nivel 1</span>
            </div>

            <div className="gamification-content">
              <div className="points-circle">
                <span className="icon">✈️</span>
              </div>
              
              <p className="points-value">{user.points} Puncte</p>
              <p className="points-hint">Rezervă prima ta cameră pentru a începe</p>
            </div>

            <button className="rewards-btn">
              Vezi Recompense
            </button>
          </div>

          {/* PREFERENCES CARD */}
          <div className="preferences-card">
            <h3>Preferințe Rapide</h3>
            
            <div className="preference-item">
              <div className="preference-label">
                <span className="preference-icon">🔔</span>
                Notificări Email
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={notifications} 
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </main>

      {/* CHATBOT BUTTON (placeholder pentru viitor) */}
      <button className="chatbot-btn" title="Chatbot - Coming Soon">
        🤖
      </button>
    </>
  );
}
