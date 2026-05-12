

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserActivePoints } from "../../services/rewardService";
import { API_BASE_URL } from "../../config/runtimeUrls";
import { getDashboardData } from "../../services/dashboardService";
import Navbar from "../Dashboard/Navbar";
import "./RewardsDetails.css";

const getStoredUserId = () => {
  const value = parseInt(localStorage.getItem("userId"), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

const toImageUrl = (path) => {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const RewardsDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userPoints, setUserPoints] = useState(0);
  const [upcomingStays, setUpcomingStays] = useState([]);
  const [selectedStay, setSelectedStay] = useState(null);
  const [reward, setReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [guestDetails, setGuestDetails] = useState([
    { name: "", email: "" }
  ]);
  const [userId, setUserId] = useState(getStoredUserId);

  useEffect(() => {
    if (location.state?.reward) setReward(location.state.reward);
    async function fetchData() {
      try {
        let resolvedUserId = getStoredUserId();
        try {
          const dashboardData = await getDashboardData();
          const dashboardUserId = Number(
            dashboardData?.client?.ClientId ||
            dashboardData?.client?.clientId ||
            dashboardData?.client?.id
          );
          if (Number.isFinite(dashboardUserId) && dashboardUserId > 0) {
            resolvedUserId = dashboardUserId;
            localStorage.setItem("userId", String(resolvedUserId));
          }
        } catch (dashboardErr) {
          console.warn("Could not resolve authenticated rewards user:", dashboardErr.message);
        }

        setUserId(resolvedUserId);
        const active = await getUserActivePoints(resolvedUserId);
        setUserPoints(active.activePoints || 0);
        const res = await fetch(`${API_BASE_URL}/api/reservations?userId=${resolvedUserId}`);
        if (res.ok) {
          const reservations = await res.json();
          const now = new Date();
          const upcoming = reservations
            .filter(r => new Date(r.requestedCheckin) > now && r.status !== 'cancelled')
            .sort((a, b) => new Date(a.requestedCheckin) - new Date(b.requestedCheckin))
            .slice(0, 5);
          setUpcomingStays(upcoming.length ? upcoming : []);
        }
      } catch {
        setUpcomingStays([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [location.state]);

  const calculatePointsToDeduct = () => {
    if (reward?.rewardType === 'per_person') {
      return reward.points * guestDetails.length;
    }
    return reward?.points || 0;
  };

  const handleApplyReward = async () => {
    if (!reward || !selectedStay) {
      alert("Please select a stay");
      return;
    }
    const pointsToDeduct = calculatePointsToDeduct();
    if (userPoints < pointsToDeduct) {
      alert(`Not enough points. You need ${pointsToDeduct} points but only have ${userPoints}`);
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/rewards/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          rewardId: reward.RewardId,
          reservationId: selectedStay.ReservationId,
          points: pointsToDeduct,
          guestCount: reward.rewardType === 'per_person' ? guestDetails.length : 1,
          guestDetails
        })
      });
      if (res.ok) {
        setUserPoints(userPoints - pointsToDeduct);
        setSuccessMessage(`Reward applied to your stay in ${selectedStay.Room?.city || 'your destination'}!`);
        setTimeout(() => {
          navigate("/rewards");
        }, 2000);
      } else {
        alert("Failed to apply reward");
      }
    } catch {
      alert("Failed to apply reward");
    } finally {
      setApplying(false);
    }
  };

  const handleGuestChange = (idx, field, value) => {
    setGuestDetails(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  };
  const handleAddGuest = () => {
    if (!selectedStay) return;
    const maxGuests = selectedStay.nrPeople || 1;
    if (guestDetails.length < maxGuests) {
      setGuestDetails(prev => [...prev, { name: "", email: "" }]);
    }
  };
  const handleRemoveGuest = (idx) => {
    setGuestDetails(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  // PREMIUM LAYOUT MARKUP
  if (!reward) {
    return (
      <>
        <Navbar />
        <div className="rewards-details-container">
          <p>No reward selected</p>
          <button onClick={() => navigate("/rewards")}>Back to Rewards</button>
        </div>
      </>
    );
  }

  return (
    <div className="premium-bg">
      <Navbar />
      <main className="premium-main-wrapper">
        <header className="premium-header">
          <h1 className="premium-title">Redeem Your Experience</h1>
          <p className="premium-subtitle">Apply your points to elevate your stay.</p>
          <div className="premium-points-available">
            <span className="premium-points-badge">
              {userPoints.toLocaleString()} PTS AVAILABLE
            </span>
          </div>
        </header>
        <section className="premium-content-row">
          <div className="premium-content-col">
            {/* I. Selected Reward */}
            <div className="premium-section">
              <div className="premium-section-title"><span>I.</span> Selected Reward</div>
              <div className="premium-reward-card">
                {reward.image && (
                  <img src={toImageUrl(reward.image)} alt={reward.title} className="premium-reward-img" />
                )}
                <div className="premium-reward-info">
                  <div className="premium-reward-header-row">
                    <div className="premium-reward-name">{reward.title}</div>
                    <span className="premium-badge">{reward.rewardType === 'per_person' ? 'PER PERSON' : 'PER BOOKING'}</span>
                  </div>
                  <div className="premium-reward-desc">{reward.desc}</div>
                  <div className="premium-reward-points">{reward.points} pts{reward.rewardType === 'per_person' && <span> / PERSON</span>}</div>
                </div>
              </div>
            </div>
            {/* II. Select Upcoming Stay */}
            <div className="premium-section">
              <div className="premium-section-title"><span>II.</span> Select Upcoming Stay</div>
              <div className="premium-stays-list">
                {loading ? (
                  <div className="premium-no-stays">Loading stays...</div>
                ) : upcomingStays.length === 0 ? (
                  <div className="premium-no-stays">
                    <p>No upcoming stays found.</p>
                    <a href="/book" className="premium-btn">Book a Stay</a>
                  </div>
                ) : (
                  upcomingStays.map(stay => {
                    const roomRes = Array.isArray(stay.RoomReservations) && stay.RoomReservations.length > 0 ? stay.RoomReservations[0] : null;
                    const room = roomRes?.Room;
                    const theme = room?.RoomTheme;
                    const isSelected = selectedStay && selectedStay.ReservationId === stay.ReservationId;
                    return (
                      <div
                        key={stay.ReservationId}
                        className={`premium-stay-card${isSelected ? ' selected' : ''}`}
                        onClick={() => setSelectedStay(stay)}
                      >
                        <div className="premium-stay-card-header">
                          <div className="premium-stay-card-title">{room?.name || 'Your Room'}</div>
                          {isSelected && <span className="premium-stay-card-selected">SELECTED</span>}
                        </div>
                        <div className="premium-stay-card-meta">
                          <span className="premium-stay-card-location">{theme?.city || ''}</span>
                          {theme?.city && <span className="premium-stay-dot">&nbsp;·&nbsp;</span>}
                          <span className="premium-stay-card-theme">{theme?.name || ''}</span>
                        </div>
                        <div className="premium-stay-card-dates-row">
                          <span className="premium-stay-card-dates">
                            {new Date(stay.requestedCheckin).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {' - '}
                            {new Date(stay.requestedCheckout).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="premium-stay-dot">&nbsp;·&nbsp;</span>
                          <span className="premium-stay-card-guests">{stay.nrPeople || 1} guest{(stay.nrPeople || 1) > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {/* III. Guest Details */}
            <div className="premium-section">
              <div className="premium-section-title premium-guest-title-row">
                <span>III.</span> Guest Details
                <button className="premium-add-guest" onClick={handleAddGuest} disabled={!selectedStay || guestDetails.length >= (selectedStay?.nrPeople || 1)}>
                  <span className="premium-add-guest-plus">＋</span> ADD GUEST
                </button>
              </div>
              <div className="premium-guest-list">
                {guestDetails.map((guest, idx) => (
                  <div className="premium-guest-row" key={idx}>
                    <div className="premium-guest-field">
                      <label className="premium-guest-label">FULL NAME</label>
                      <input type="text" value={guest.name} onChange={e => handleGuestChange(idx, 'name', e.target.value)} placeholder="Full Name" />
                    </div>
                    <div className="premium-guest-field">
                      <label className="premium-guest-label">EMAIL ADDRESS</label>
                      <input type="email" value={guest.email} onChange={e => handleGuestChange(idx, 'email', e.target.value)} placeholder="Email Address" />
                    </div>
                    {guestDetails.length > 1 && (
                      <button
                        className="premium-remove-guest"
                        type="button"
                        title="Remove guest"
                        onClick={() => handleRemoveGuest(idx)}
                      >
                        &minus;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* SIDEBAR SUMMARY */}
          <aside className="premium-sidebar">
            <div className="premium-sidebar-card">
              <div className="premium-sidebar-title">Redemption Summary</div>
              <div className="premium-sidebar-row"><span>Selected Reward</span><span>{reward.title}</span></div>
              <div className="premium-sidebar-row"><span>Number of Guests</span><span>{reward.rewardType === 'per_person' ? String(guestDetails.length).padStart(2, '0') : '01'}</span></div>
              <div className="premium-sidebar-row"><span>Cost per person</span><span>{reward.points} pts</span></div>
              <div className="premium-sidebar-row premium-sidebar-total"><span>Total Points</span><span>{calculatePointsToDeduct()} pts</span></div>
              <div className="premium-sidebar-balance">BALANCE IMPACT <span>{userPoints.toLocaleString()} → {(userPoints - calculatePointsToDeduct()).toLocaleString()}</span></div>
              <button
                className="premium-sidebar-btn"
                onClick={handleApplyReward}
                disabled={applying || !selectedStay || (reward.rewardType === 'per_person' && guestDetails.length < 1)}
              >
                {applying ? 'Applying...' : 'APPLY REWARD'}
              </button>
              <div className="premium-sidebar-note">POINTS ARE NON-REFUNDABLE ONCE APPLIED TO A CONFIRMED STAY.</div>
              {successMessage && <div className="success-message">{successMessage}</div>}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default RewardsDetails;

