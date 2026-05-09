import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "./Rewards.css";
import { getUserActivePoints, getUserPendingPoints, getUserPoints, getAllRewards } from "../../services/rewardService";

// Get userId from localStorage (set during login)
const USER_ID = parseInt(localStorage.getItem("userId")) || 1;

const getStayRoom = (stay) => stay?.room || stay?.RoomReservations?.[0]?.Room || null;
const getStayTheme = (stay) => getStayRoom(stay)?.RoomTheme || null;
const toImageUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `http://localhost:9001${path}`;
};

export default function Rewards() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePoints, setActivePoints] = useState(0);
  const [pendingPoints, setPendingPoints] = useState(0);
  const [history, setHistory] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingStay, setUpcomingStay] = useState(null);
  const [upcomingStayImage, setUpcomingStayImage] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Function to fetch data - can be called multiple times
  const fetchData = async () => {
    try {
      const active = await getUserActivePoints(USER_ID);
      const pending = await getUserPendingPoints(USER_ID);
      const all = await getUserPoints(USER_ID);
      const rewardsData = await getAllRewards();

      setActivePoints(active.activePoints);
      setPendingPoints(pending.pendingPoints);
      setHistory(
        all.map((p) => ({
          id: p.RewardPointId,
          label: p.description || "Reward",
          date: new Date(p.createdAt).toLocaleDateString(),
          status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
          amount: (p.amount > 0 ? "+" : "") + p.amount + "p",
          icon: p.status === "redeemed" ? "shopping_bag" : "workspace_premium"
        }))
      );

      // Filter only active rewards
      const activeRewards = Array.isArray(rewardsData) 
        ? rewardsData.filter(r => r.active !== false)
        : [];
      setRewards(activeRewards);

      // Fetch upcoming stay
      try {
        const res = await fetch(`http://localhost:9001/api/reservations/upcoming/${USER_ID}`);
        console.log("Upcoming reservations API response:", res.status, res.statusText);
        if (res.ok) {
          const stay = await res.json();
          console.log("Upcoming stay data:", stay);
          const detailsRes = await fetch(`http://localhost:9001/api/reservations/${stay.ReservationId}`);
          if (detailsRes.ok) {
            const stayDetails = await detailsRes.json();
            setUpcomingStay(stayDetails);
          } else {
            setUpcomingStay(stay);
          }
        } else {
          console.log("API returned non-ok status:", res.status);
          // Try to get error details
          const errorData = await res.json().catch(() => ({}));
          console.log("Error details:", errorData);
        }
      } catch (err) {
        console.log("Fetch error:", err.message);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Refetch data whenever returning to this page
  useEffect(() => {
    fetchData();
  }, [location]);

  // Fetch room theme image for upcoming stay
  useEffect(() => {
    const room = getStayRoom(upcomingStay);
    const theme = getStayTheme(upcomingStay);
    const firstThemeImage = theme?.images?.[0]?.imageUrl;
    setUpcomingStayImage(
      toImageUrl(theme?.showcaseImage || room?.showcaseImage || room?.image || theme?.image || firstThemeImage)
    );
  }, [upcomingStay]);

  const handlePrevCarousel = () => {
    setCarouselIndex((prev) => (prev - 1 + rewards.length) % rewards.length);
  };

  const handleNextCarousel = () => {
    setCarouselIndex((prev) => (prev + 1) % rewards.length);
  };

  const visibleRewards = rewards.slice(carouselIndex, carouselIndex + 3);
  const upcomingRoom = getStayRoom(upcomingStay);
  const upcomingTheme = getStayTheme(upcomingStay);

  return (
    <>
      <Navbar />
      <main className="rewards-luxury-page">
        {/* PERSONAL SANCTUARY SECTION */}
        <section className="luxury-sanctuary">
          <div className="sanctuary-label">PERSONAL SANCTUARY</div>
          <p className="sanctuary-subtitle">
            Your journey towards the extraordinary continues. Explore your curated benefits and upcoming escapes tailored for your discerning taste.
          </p>
        </section>

        {/* POINTS BALANCE SECTION */}
        <section className="luxury-points-section">
          <div className="points-balance">
            <h3 className="section-label">POINTS BALANCE</h3>
            <div className="points-amount">
              <span className="points-number">{activePoints.toLocaleString()}</span>
              <span className="points-unit">pts</span>
            </div>
            {pendingPoints > 0 && (
              <p className="pending-info">+{pendingPoints}p pending</p>
            )}
            <button className="luxury-btn" onClick={() => navigate("/booking")}>
              Apply to Stay
            </button>
          </div>

          {/* UPCOMING STAY SECTION */}
          {upcomingStay && (
            <div className="upcoming-stay">
              <div className="upcoming-header">
                <h3 className="section-label">UPCOMING STAY</h3>
                <a href="/reservations" className="view-all-stays">VIEW ALL STAYS</a>
              </div>
              <div className="stay-card">
                {upcomingStayImage ? (
                  <img 
                    src={upcomingStayImage}
                    alt="Upcoming stay"
                    className="stay-card-image"
                  />
                ) : upcomingRoom?.image ? (
                  <img 
                    src={toImageUrl(upcomingRoom.image)}
                    alt="Upcoming stay"
                    className="stay-card-image"
                  />
                ) : (
                  <div style={{ width: 160, height: 160, background: '#e5e7eb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '2rem' }}>-</span>
                  </div>
                )}
                <div className="stay-card-content">
                  <h4 className="stay-card-title">
                    {upcomingTheme?.name || upcomingRoom?.RoomName || upcomingRoom?.name || "Your Upcoming Stay"}
                  </h4>
                  <p className="stay-card-dates">
                    {new Date(upcomingStay.requestedCheckin).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {" - "}
                    {new Date(upcomingStay.requestedCheckout).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="stay-card-tags">
                    {upcomingTheme?.city && (
                      <span className="tag ocean-view">{upcomingTheme.city}</span>
                    )}
                    {upcomingTheme?.theme && (
                      <span className="tag king-bed">{upcomingTheme.theme}</span>
                    )}
                  </div>
                  <button className="stay-manage-btn" onClick={() => navigate(`/reservation/${upcomingStay.ReservationId}`)}>Manage</button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* AVAILABLE REWARDS CAROUSEL */}
        <section className="luxury-rewards-section">
          <div className="rewards-section-header">
            <div>
              <h3 className="section-label">CURATED FOR YOU</h3>
              <h2 className="section-title">Available Rewards</h2>
            </div>
            {rewards.length > 3 && (
              <div className="carousel-controls">
                <button className="carousel-btn" onClick={handlePrevCarousel}>‹</button>
                <button className="carousel-btn" onClick={handleNextCarousel}>›</button>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
              Loading rewards...
            </div>
          ) : rewards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
              No rewards available at the moment.
            </div>
          ) : (
            <div className="rewards-carousel">
              {visibleRewards.map((reward, idx) => (
                <div key={reward.RewardId || idx} className="luxury-reward-card">
                  <div 
                    className="reward-card-image"
                    style={{ 
                      backgroundImage: reward.image 
                        ? `url('http://localhost:9001${reward.image}')` 
                        : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                    }}
                  >
                    <div className="reward-card-cost">{reward.points}p</div>
                  </div>
                  <div className="luxury-reward-content">
                    <h4 className="reward-title">{reward.title}</h4>
                    <p className="reward-desc">{reward.desc}</p>
                    <button 
                      className={`luxury-redeem-btn ${activePoints < reward.points ? 'disabled' : ''}`}
                      disabled={activePoints < reward.points}
                      onClick={() => navigate('/rewards-details', { state: { reward } })}
                    >
                      {activePoints < reward.points ? "NOT ENOUGH POINTS" : "REDEEM"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* POINTS HISTORY */}
        <section className="luxury-history-section">
          <h2 className="section-title">Points History</h2>
          <div className="history-table-wrapper">
            <table className="luxury-history-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#999', padding: '40px 20px' }}>
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  history.slice(0, 10).map(h => (
                    <tr key={h.id}>
                      <td>{h.label}</td>
                      <td>{h.date}</td>
                      <td><span className={`status-badge ${h.status.toLowerCase()}`}>{h.status}</span></td>
                      <td className="text-right">
                        <span className={`amount ${h.amount.startsWith('+') ? 'positive' : 'negative'}`}>
                          {h.amount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
