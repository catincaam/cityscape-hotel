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
          <h2>Dashboard unavailable</h2>
          <p>Could not load user data.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="dashboard">
        {/* BLOCK 1: WELCOME */}
        <section className="block-header">
          <h1>Welcome back, {data?.client?.FirstName || "Guest"}!</h1>
          <p>Discover your journey with us</p>
        </section>

        {/* BLOCK 2: CITY POINTS */}
        <section className="block-city-points">
          <div className="city-points-card">
            <h2>City Points</h2>
            <div className="points-value">{data?.cityPoints ?? 0}</div>
            <p className="points-text">Start earning rewards with every stay</p>
            <button 
              className="btn-primary"
              onClick={() => navigate("/rewards")}
            >
              Explore rewards →
            </button>
          </div>
        </section>

        {/* BLOCK 3: EXPLORE */}
        <section className="block-explore">
          <h3>Explore Themed Rooms</h3>
          <p>Discover unique stays inspired by the world's most iconic cities</p>
          <button 
            className="btn-secondary"
            onClick={() => navigate("/explore")}
          >
            Browse rooms →
          </button>
        </section>

        {/* BLOCK 4: QUICK ACTIONS */}
        <section className="block-actions">
          <div className="action-card">
            <h4>Book a Stay</h4>
            <p>Explore our city-themed rooms and find your next getaway</p>
            <button className="card-link" onClick={() => navigate("/booking")}>
              Start booking →
            </button>
          </div>

          <div className="action-card">
            <h4>Services & Spa</h4>
            <p>Book a massage, dinner, or local tour</p>
            <button className="card-link" onClick={() => navigate("/services")}>
              Browse menu →
            </button>
          </div>

          <div className="action-card">
            <h4>Rewards</h4>
            <p>Redeem your points and enjoy exclusive benefits</p>
            <button className="card-link" onClick={() => navigate("/rewards")}>
              View rewards →
            </button>
          </div>
        </section>

        {/* BLOCK 5: RESERVATIONS */}
        <section className="block-reservations">
          <h3>Your Upcoming Stays</h3>
          {data?.recentReservations && data.recentReservations.length > 0 ? (
            <div className="reservations-list">
              {data.recentReservations.map((res) => (
                <div key={res.reservationId} className="reservation-item">
                  <div className="reservation-info">
                    <h4>{res.room}</h4>
                    <p className="city">{res.city}</p>
                    <p className="dates">
                      {new Date(res.checkIn).toLocaleDateString("en-US", { day: 'numeric', month: 'short' })} - 
                      {new Date(res.checkOut).toLocaleDateString("en-US", { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-block">
              <h4>Your stays will appear here</h4>
              <p>Explore rooms and start building your journey</p>
              <button 
                className="btn-secondary"
                onClick={() => navigate("/explore")}
              >
                Explore rooms →
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
