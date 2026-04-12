import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Navbar from "../Dashboard/Navbar";
import profilePicture from "../../assets/profilePicture.jpg";
import { getDashboardData } from "../../services/dashboardService";
import { getUserActivePoints } from "../../services/rewardService";
import "./ProfilePage.css";
import { GoogleLogin, googleLogout } from '@react-oauth/google';

export default function ProfilePage() {
  const navigate = useNavigate();
  const userId = parseInt(localStorage.getItem("userId")) || 1;
  const [notifications, setNotifications] = useState(true);
  const [userData, setUserData] = useState(null);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    async function loadUserData() {
      try {
        const data = await getDashboardData();
        setUserData(data);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    }
    loadUserData();
  }, []);

  useEffect(() => {
    async function loadPoints() {
      try {
        const pointsData = await getUserActivePoints(userId);
        setUserPoints(pointsData.activePoints || 0);
      } catch (err) {
        console.error("Error loading points:", err);
      }
    }
    loadPoints();
  }, [userId]);

  const user = {
    firstName: userData?.client?.FirstName || "User",
    lastName: userData?.client?.LastName || "",
    email: userData?.client?.Email || "user@email.com",
    level: "Explorer",
    points: userPoints,
    nextLevelPoints: 500,
    reservationsCount: userData?.recentReservations?.length || 0
  };

  const paidReservations = userData?.recentReservations || [];

  // Handler for Google login success
  const handleGoogleSuccess = async (credentialResponse) => {
    // Send credentialResponse.credential to backend for verification
    // Example: await api.post('/auth/google', { token: credentialResponse.credential })
    alert('Google login success! Token: ' + credentialResponse.credential);
  };

  // Handler for Google login error
  const handleGoogleError = () => {
    alert('Google login failed!');
  };

  return (
    <>
      <Navbar />
      
      <main className="profile-page">
        {/* USER CARD */}
        <section className="user-card">
          <div className="user-info">
            <div className="avatar-large">
              <img src={userData?.client?.profilePicture || profilePicture} alt="User Avatar" onError={(e) => { e.target.src = profilePicture; }} />
            </div>
            
            <div className="user-details">
              <h1>Hello, {user.firstName} {user.lastName} 👋</h1>
              <p className="user-meta">Member {user.level} • {user.email}</p>
              <p className="user-tagline">Ready for your next adventure?</p>
            </div>
          </div>

          <button className="edit-profile-btn" onClick={() => navigate('/profile/edit')}>
            Edit Profile
          </button>
        </section>

        {/* RESERVATIONS LIST */}
        {paidReservations.length === 0 ? (
          <section className="empty-state">
            <div className="empty-icon">
              <span>🧳</span>
            </div>
            
            <h2>No paid reservations yet</h2>
            <p>
              Your paid trips will appear here. Discover unique themed rooms
              and complete your first booking.
            </p>

            <button className="discover-btn" onClick={() => window.location.href = '/explore'}>
              Explore Rooms
            </button>
          </section>
        ) : (
          <section className="reservations-section" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Your Reservations</h2>
              <button
                className="view-more-btn"
                style={{ background: '#1f2937', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}
                onClick={() => navigate('/reservations')}
              >
                View More
              </button>
            </div>
            <div className="reservations-list">
              {paidReservations.map((res) => (
                <div key={res.reservationId} className="reservation-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
                          {new Date(res.checkIn).toLocaleDateString("en-US", { day: 'numeric', month: 'short' })} - 
                          {new Date(res.checkOut).toLocaleDateString("en-US", { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="res-amount">{res.totalAmount} RON</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                    <button className="details-btn" style={{ background: 'transparent', color: '#c6a969', border: 'none', fontWeight: 500, fontSize: 14, boxShadow: 'none', padding: '0 8px', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate(`/reservation/${res.reservationId}`)}>
                      View Details
                    </button>
                  </div>
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
            </div>

            <div className="gamification-content">
              <div className="points-circle">
                <span className="icon">✈️</span>
              </div>
              
              <p className="points-value">{user.points} Points</p>
              <p className="points-hint">Book your first room to get started</p>
            </div>

            <button className="rewards-btn" onClick={() => navigate('/rewards')}>
              View Rewards
            </button>
          </div>

          {/* PREFERENCES CARD */}
          <div className="preferences-card">
            <h3>Quick Preferences</h3>
            
            <div className="preference-item">
              <div className="preference-label">
                <span className="preference-icon">🔔</span>
                Email Notifications
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

      {/* Social Login Button */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '2rem 0' }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />
      </div>
    </>
  );
}
