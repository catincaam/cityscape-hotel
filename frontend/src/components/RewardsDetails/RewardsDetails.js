import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserActivePoints, getUserPoints } from "../../services/rewardService";
import Navbar from "../Dashboard/Navbar";
import "./RewardsDetails.css";

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
  const USER_ID = parseInt(localStorage.getItem("userId")) || 1;

  useEffect(() => {
    // Get reward from navigation state
    if (location.state?.reward) {
      setReward(location.state.reward);
    }

    // Fetch user points and upcoming stays
    async function fetchData() {
      try {
        const active = await getUserActivePoints(USER_ID);
        setUserPoints(active.activePoints || 0);

        // Fetch upcoming stays
        const res = await fetch(`http://localhost:9001/api/reservations?userId=${USER_ID}`);
        if (res.ok) {
          const reservations = await res.json();
          const now = new Date();
          const upcoming = reservations
            .filter(r => new Date(r.requestedCheckin) > now && r.status !== 'cancelled')
            .sort((a, b) => new Date(a.requestedCheckin) - new Date(b.requestedCheckin))
            .slice(0, 5);
          
          if (upcoming.length === 0) {
            // Add mock stays for testing
            const mockStays = [
              {
                ReservationId: 999,
                requestedCheckin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                requestedCheckout: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
                Room: {
                  name: "The Azure Suite",
                  city: "Santorini, Greece"
                }
              },
              {
                ReservationId: 1000,
                requestedCheckin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                requestedCheckout: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
                Room: {
                  name: "Paris Loft",
                  city: "Paris, France"
                }
              }
            ];
            setUpcomingStays(mockStays);
          } else {
            setUpcomingStays(upcoming);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        // Add mock stays for testing
        const mockStays = [
          {
            ReservationId: 999,
            requestedCheckin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            requestedCheckout: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            Room: {
              name: "The Azure Suite",
              city: "Santorini, Greece"
            }
          },
          {
            ReservationId: 1000,
            requestedCheckin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            requestedCheckout: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
            Room: {
              name: "Paris Loft",
              city: "Paris, France"
            }
          }
        ];
        setUpcomingStays(mockStays);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [USER_ID, location.state]);

  const handleApplyReward = async () => {
    if (!reward || !selectedStay) {
      alert("Please select a stay");
      return;
    }

    if (userPoints < reward.points) {
      alert("Not enough points");
      return;
    }

    setApplying(true);
    try {
      const res = await fetch("http://localhost:9001/api/rewards/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: USER_ID,
          rewardId: reward.RewardId,
          reservationId: selectedStay.ReservationId,
          points: reward.points
        })
      });

      if (res.ok) {
        // Deduct points from current state
        setUserPoints(userPoints - reward.points);
        setSuccessMessage(`Reward applied to your stay in ${selectedStay.Room?.city || 'your destination'}!`);
        setTimeout(() => {
          navigate("/rewards");
        }, 2000);
      } else {
        alert("Failed to apply reward");
      }
    } catch (error) {
      console.error("Error applying reward:", error);
      alert("Failed to apply reward");
    } finally {
      setApplying(false);
    }
  };

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
    <>
      <Navbar />
      <main className="reward-redemption-page">
        <section className="redemption-header">
          <p className="section-label">REDEMPTION JOURNEY</p>
          <h1>Apply Reward to Your Stay</h1>
        </section>

        <section className="redemption-content">
          {/* SELECTED REWARD */}
          <div className="reward-summary-section">
            <p className="section-label">SELECTED REWARD SUMMARY</p>
            <div className="reward-summary">
              {reward.image && (
                <img
                  src={`http://localhost:9001${reward.image}`}
                  alt={reward.title}
                  className="reward-summary-image"
                />
              )}
              <div className="reward-summary-content">
                <h3>{reward.title}</h3>
                <p>{reward.desc}</p>
                <span className="reward-badge">⭐ PREMIUM BENEFIT</span>
              </div>
            </div>
          </div>

          {/* SELECT STAY */}
          <div className="select-stay-section">
            <div className="select-stay-header">
              <p className="section-label">SELECT UPCOMING STAY</p>
              <a href="#" className="view-all-link" onClick={(e) => { e.preventDefault(); navigate("/reservations"); }}>
                View All Reservations
              </a>
            </div>

            {loading ? (
              <p>Loading stays...</p>
            ) : upcomingStays.length === 0 ? (
              <div className="no-stays">
                <p>No upcoming stays. Make a booking first!</p>
                <button className="primary-btn" onClick={() => navigate("/booking")}>
                  Book Now
                </button>
              </div>
            ) : (
              <div className="stays-list">
                {upcomingStays.map((stay) => (
                  <label key={stay.ReservationId} className="stay-option">
                    <input
                      type="radio"
                      name="stay"
                      value={stay.ReservationId}
                      checked={selectedStay?.ReservationId === stay.ReservationId}
                      onChange={() => setSelectedStay(stay)}
                    />
                    <div className="stay-details">
                      <h4>{stay.Room?.name || "Your Room"}</h4>
                      <p>
                        {new Date(stay.requestedCheckin).toLocaleDateString()} - {new Date(stay.requestedCheckout).toLocaleDateString()}
                      </p>
                      <span className="stay-location">{stay.Room?.city}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          {successMessage ? (
            <div className="success-message">
              ✓ {successMessage}
            </div>
          ) : (
            <div className="action-buttons">
              <button
                className="confirm-btn"
                onClick={handleApplyReward}
                disabled={!selectedStay || applying || userPoints < reward.points}
              >
                {applying ? "Applying..." : "Confirm Reward"}
              </button>
              <button className="cancel-btn" onClick={() => navigate("/rewards")}>
                Cancel
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default RewardsDetails;
