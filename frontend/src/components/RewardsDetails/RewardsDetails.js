import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Gift,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
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

const formatDate = (date, options) => new Date(date).toLocaleDateString("en-US", options);
const formatReservationRef = (id) => `BK-${String(id || "").padStart(4, "0")}`;

export default function RewardsDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userPoints, setUserPoints] = useState(0);
  const [upcomingStays, setUpcomingStays] = useState([]);
  const [selectedStay, setSelectedStay] = useState(null);
  const [reward, setReward] = useState(() => {
    if (location.state?.reward) return location.state.reward;
    try {
      return JSON.parse(sessionStorage.getItem("selectedReward") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [guestDetails, setGuestDetails] = useState([{ name: "", email: "" }]);
  const [userId, setUserId] = useState(getStoredUserId);

  useEffect(() => {
    if (location.state?.reward) {
      setReward(location.state.reward);
      sessionStorage.setItem("selectedReward", JSON.stringify(location.state.reward));
    }
  }, [location.state]);

  useEffect(() => {
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
            .filter((reservation) => new Date(reservation.requestedCheckin) > now && reservation.status !== "cancelled")
            .sort((a, b) => new Date(a.requestedCheckin) - new Date(b.requestedCheckin))
            .slice(0, 5);
          setUpcomingStays(upcoming);
        }
      } catch {
        setUpcomingStays([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const isPerPerson = reward?.rewardType === "per_person";
  const pointsToDeduct = reward ? (isPerPerson ? reward.points * guestDetails.length : reward.points) : 0;
  const rewardImage = toImageUrl(reward?.image);
  const selectedRoom = selectedStay?.RoomReservations?.[0]?.Room;
  const selectedTheme = selectedRoom?.RoomTheme;

  const handleGuestChange = (idx, field, value) => {
    setGuestDetails((prev) => prev.map((guest, i) => (
      i === idx ? { ...guest, [field]: value } : guest
    )));
  };

  const handleAddGuest = () => {
    if (!selectedStay) return;
    const maxGuests = selectedStay.nrPeople || 1;
    if (guestDetails.length < maxGuests) {
      setGuestDetails((prev) => [...prev, { name: "", email: "" }]);
    }
  };

  const handleRemoveGuest = (idx) => {
    setGuestDetails((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  const handleApplyReward = async () => {
    if (!reward || !selectedStay) {
      alert("Please select a stay");
      return;
    }

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
          guestCount: isPerPerson ? guestDetails.length : 1,
          guestDetails
        })
      });

      if (res.ok) {
        setUserPoints(userPoints - pointsToDeduct);
        setSuccessMessage("Reward applied to your selected stay.");
        setTimeout(() => navigate("/rewards"), 2000);
      } else {
        alert("Failed to apply reward");
      }
    } catch {
      alert("Failed to apply reward");
    } finally {
      setApplying(false);
    }
  };

  if (!reward) {
    return (
      <>
        <Navbar />
        <main className="reward-redemption-page">
          <section className="reward-empty">
            <p>No reward selected.</p>
            <button type="button" onClick={() => navigate("/rewards")}>Back to Rewards</button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="reward-redemption-page">
        <section
          className={`reward-redemption-hero ${rewardImage ? "" : "empty"}`}
          style={rewardImage ? { backgroundImage: `linear-gradient(90deg, rgba(18, 16, 12, 0.74), rgba(18, 16, 12, 0.44)), url("${rewardImage}")` } : undefined}
        >
          <div className="reward-hero-content">
            <p>{reward.category || "Cityscape Reward"}</p>
            <h1>{reward.title}</h1>
            <span>{reward.desc || "Apply your points to elevate your upcoming stay."}</span>
            <div className="reward-hero-actions">
              <div>
                <small>{isPerPerson ? "Reward cost / person" : "Reward cost"}</small>
                <strong>{reward.points.toLocaleString()} pts</strong>
              </div>
              <button type="button" onClick={() => document.getElementById("reward-flow")?.scrollIntoView({ behavior: "smooth" })}>
                Redeem reward
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <section className="reward-redemption-content" id="reward-flow">
          <div className="reward-timeline" aria-hidden="true" />

          <div className="reward-redemption-main">
            <section className="reward-step">
              <div className="reward-step-marker">1</div>
              <div className="reward-step-copy">
                <h2>Selected Reward</h2>
                <p>Confirm your reward before choosing the stay where it will be applied.</p>
              </div>
              <article className="selected-reward-row">
                <img src={rewardImage || "/logo192.png"} alt={reward.title} />
                <div className="selected-reward-copy">
                  <h3>{reward.title}</h3>
                  <p>{reward.desc}</p>
                  <div className="selected-reward-meta">
                    <span><Gift size={14} /> {isPerPerson ? "Per person" : "Per booking"}</span>
                    <span><Sparkles size={14} /> {reward.points.toLocaleString()} pts</span>
                  </div>
                </div>
                <button type="button" onClick={() => navigate("/rewards")}>
                  Modify
                  <ChevronRight size={13} />
                </button>
              </article>
            </section>

            <section className="reward-step">
              <div className="reward-step-marker">2</div>
              <div className="reward-step-header">
                <div className="reward-step-copy">
                  <h2>Choose Reservation</h2>
                  <p>Apply this reward to one of your upcoming confirmed stays.</p>
                </div>
                <button type="button" className="reward-all-stays" onClick={() => navigate("/reservations")}>
                  All reservations
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="reward-stays-list">
                {loading ? (
                  <div className="reward-state-card">Loading stays...</div>
                ) : upcomingStays.length === 0 ? (
                  <div className="reward-state-card">
                    <p>No upcoming stays found.</p>
                    <button type="button" onClick={() => navigate("/booking")}>Book a Stay</button>
                  </div>
                ) : (
                  upcomingStays.map((stay) => {
                    const room = stay.RoomReservations?.[0]?.Room;
                    const theme = room?.RoomTheme;
                    const isSelected = selectedStay?.ReservationId === stay.ReservationId;
                    const checkIn = new Date(stay.requestedCheckin);
                    const checkOut = new Date(stay.requestedCheckout);

                    return (
                      <button
                        type="button"
                        key={stay.ReservationId}
                        className={`reward-stay-option ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedStay(stay)}
                      >
                        <div className="reward-date-tile">
                          <span>{formatDate(checkIn, { month: "short" })}</span>
                          <strong>{formatDate(checkIn, { day: "2-digit" })}-{formatDate(checkOut, { day: "2-digit" })}</strong>
                        </div>
                        <div className="reward-stay-body">
                          <h3>{theme?.name || room?.RoomName || "Your Room"}</h3>
                          <div className="reward-stay-meta">
                            <span><MapPin size={14} /> {theme?.city || "Cityscape"}</span>
                            <span><Users size={14} /> {stay.nrPeople || 1} guest{(stay.nrPeople || 1) > 1 ? "s" : ""}</span>
                            <span>{formatReservationRef(stay.ReservationId)}</span>
                          </div>
                        </div>
                        <div className="reward-selected-icon">
                          {isSelected ? <Check size={19} /> : <ChevronRight size={20} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="reward-step">
              <div className="reward-step-marker muted">3</div>
              <div className="reward-step-copy">
                <h2>Guest Details</h2>
                <p>Optional guest details for the reward confirmation.</p>
              </div>
              <div className="reward-guest-list">
                <button
                  className="reward-add-guest"
                  type="button"
                  onClick={handleAddGuest}
                  disabled={!selectedStay || guestDetails.length >= (selectedStay?.nrPeople || 1)}
                >
                  Add guest
                </button>
                {guestDetails.map((guest, idx) => (
                  <div className="reward-guest-row" key={idx}>
                    <div className="reward-guest-field">
                      <label>Full name</label>
                      <input type="text" value={guest.name} onChange={(event) => handleGuestChange(idx, "name", event.target.value)} placeholder="Full Name" />
                    </div>
                    <div className="reward-guest-field">
                      <label>Email address</label>
                      <input type="email" value={guest.email} onChange={(event) => handleGuestChange(idx, "email", event.target.value)} placeholder="Email Address" />
                    </div>
                    {guestDetails.length > 1 && (
                      <button className="reward-remove-guest" type="button" title="Remove guest" onClick={() => handleRemoveGuest(idx)}>
                        &minus;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="reward-summary-sidebar">
            <div className="reward-summary-card">
              <h3>Redemption Summary</h3>

              <div className="reward-summary-block">
                <p>Selected reward</p>
                <div className="reward-summary-line">
                  <span>
                    <strong>{reward.title}</strong>
                    <small>x{isPerPerson ? guestDetails.length : 1} {isPerPerson ? "person" : "booking"}</small>
                  </span>
                  <b>{pointsToDeduct.toLocaleString()} pts</b>
                </div>
              </div>

              {selectedStay && (
                <div className="reward-summary-block">
                  <p>Stay details</p>
                  <div className="reward-summary-stay">
                    <CalendarDays size={15} />
                    <span>{selectedTheme?.name || selectedRoom?.RoomName || "Selected stay"}</span>
                  </div>
                </div>
              )}

              <div className="reward-balance-box">
                <span>Balance impact</span>
                <strong>{userPoints.toLocaleString()} -> {(userPoints - pointsToDeduct).toLocaleString()} pts</strong>
              </div>

              <button
                className="reward-summary-btn"
                type="button"
                onClick={handleApplyReward}
                disabled={applying || !selectedStay || pointsToDeduct > userPoints}
              >
                {applying ? "Applying..." : "Apply Reward"}
              </button>

              <div className="reward-secure-note"><ShieldCheck size={14} /> Secure redemption</div>
              <p className="reward-summary-note">Points are non-refundable once applied to a confirmed stay.</p>

              {successMessage && <div className="reward-success-message">{successMessage}</div>}
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
