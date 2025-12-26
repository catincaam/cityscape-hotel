import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardData } from "../../services/dashboardService";
import Navbar from "./Navbar";
import "./Dashboard.css";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const result = await getDashboardData();
        setData(result);
      } catch (err) {
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <main className="dashboard">
          <h2>Dashboard indisponibil</h2>
          <p>Nu s-au putut încărca datele utilizatorului.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="dashboard">
        {/* HEADER */}
        <header>
          <h1>
            Welcome back, {data?.client?.FirstName || "Guest"}!
          </h1>
          <p className="subtitle">Ready for your next adventure?</p>
        </header>

        {/* STATS */}
        <section className="dashboard-stats">
          <div className="stat-card">
            <h4>City Points</h4>
            <div className="value">{data?.cityPoints ?? 0}</div>
          </div>

          <div className="stat-card gold">
            <h4>Traveller Status</h4>
            <div className="value">{data?.status || "—"}</div>
          </div>
        </section>

        {/* EXPLORE */}
        <section className="explore-banner">
          <div className="explore-content">
            <span className="badge">Featured</span>
            <h3>Explore Themed Rooms</h3>
            <p>
              Discover our unique suites inspired by the world’s most iconic
              cities.
            </p>
          </div>

          <button
            className="explore-btn"
            onClick={() => navigate("/explore")}
          >
            Browse All Rooms →
          </button>
        </section>

        {/* NEXT DESTINATION */}
        {data?.nextDestination && (
          <section className="next-destination">
            <h3>Upcoming Reservation</h3>
            <div className="destination-info">
              <p className="booking-code">#{data.nextDestination.reservationId}</p>
              <span className="separator">•</span>
              <p className="destination-city">{data.nextDestination.city}</p>
              <span className="separator">•</span>
              <p className="destination-room">{data.nextDestination.room}</p>
              <span className="separator">•</span>
              <div className="destination-details">
                <span className="detail-label">
                  {new Date(data.nextDestination.checkIn).toLocaleDateString("ro-RO", { 
                    day: 'numeric', 
                    month: 'short'
                  })}
                </span>
                <span className="detail-value">→</span>
                <span className="detail-label">
                  {new Date(data.nextDestination.checkOut).toLocaleDateString("ro-RO", { 
                    day: 'numeric', 
                    month: 'short'
                  })}
                </span>
              </div>
              <span className="separator">•</span>
              <span className="detail-value">
                {data.nextDestination.guests} {data.nextDestination.guests === 1 ? 'guest' : 'guests'}
              </span>
              <button onClick={() => navigate(`/profile`)}>
                View Details
              </button>
            </div>
          </section>
        )}

        {/* ACTIONS */}
        <section className="action-grid">
          <div className="action-card">
            <h4>Book a Stay</h4>
            <p>Explore our city-themed rooms and find your next getaway.</p>
            <button
              className="action-link"
              onClick={() => navigate("/booking")}
            >
              Start Booking →
            </button>
          </div>

          <div className="action-card" onClick={() => navigate("/services")}>
            <h4>Services & Spa</h4>
            <p>Book a massage, dinner, or local tour.</p>
            <button className="action-link">Browse Menu →</button>
          </div>

          <div className="action-card dark">
            <h4>Play & Win</h4>
            <p>Spin the globe or play trivia to win rewards.</p>
            <span>Play Now →</span>
          </div>
        </section>

        {/* PAID RESERVATIONS */}
        <section className="next-destination">
          <h3>Your Reservations</h3>
          {data?.recentReservations && data.recentReservations.length > 0 ? (
            <div className="recent-list">
              {data.recentReservations.map((res) => (
                <div key={res.reservationId} className="recent-item">
                  <div className={`status-indicator ${res.status}`}></div>
                  <div className="recent-info">
                    <div className="recent-header">
                      <span className="recent-room">{res.room}</span>
                      <span className={`booking-status-badge ${res.status}`}>
                        {res.status === 'active' ? '🟢 Active' : 
                         res.status === 'upcoming' ? '🔵 Upcoming' : 
                         '⚪ Past'}
                      </span>
                    </div>
                    <div className="recent-details">
                      <span className="recent-code">#{res.reservationId}</span>
                      <span className="recent-city">{res.city}</span>
                      <span className="recent-dates">
                        {new Date(res.checkIn).toLocaleDateString("ro-RO", { day: 'numeric', month: 'short' })} - 
                        {new Date(res.checkOut).toLocaleDateString("ro-RO", { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No completed reservations yet.</p>
          )}
        </section>
      </main>
    </>
  );
}
