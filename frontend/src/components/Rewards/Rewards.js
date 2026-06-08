import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "./Rewards.css";
import { getUserActivePoints, getUserPendingPoints, getUserPoints, getAllRewards } from "../../services/rewardService";
import { API_BASE_URL } from "../../config/runtimeUrls";
import { getDashboardData } from "../../services/dashboardService";

const getStayRoom = (stay) => stay?.room || stay?.RoomReservations?.[0]?.Room || null;
const getStayTheme = (stay) => getStayRoom(stay)?.RoomTheme || null;

const toImageUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const getPointReservation = (point) => point.Reservation || point.reservation || null;

const getStoredUserId = () => {
  const value = parseInt(localStorage.getItem("userId"), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

const getPointTheme = (point) => {
  const reservation = getPointReservation(point);
  return reservation?.RoomReservations?.[0]?.Room?.RoomTheme || null;
};

const cleanPointDescription = (point) => {
  const raw = String(point.description || "").trim();
  const theme = getPointTheme(point);
  const roomName = theme?.name || "Cityscape stay";
  const city = theme?.city ? `, ${theme.city}` : "";

  if (point.status === "redeemed" || point.amount < 0) {
    return raw.replace(/^Redeemed demo reward:/i, "Reward redeemed:") || "Reward redeemed";
  }

  if (/demo points|pending demo points/i.test(raw)) {
    return point.status === "pending"
      ? `Upcoming stay points - ${roomName}${city}`
      : `Completed stay reward - ${roomName}${city}`;
  }

  if (/reservation reward/i.test(raw)) {
    return `Upcoming stay points - ${roomName}${city}`;
  }

  if (/puncte din rezervare/i.test(raw)) {
    return `Completed stay reward - ${roomName}${city}`;
  }

  if (/test points/i.test(raw)) {
    return "Manual loyalty adjustment";
  }

  return raw || (point.status === "pending" ? "Upcoming stay points" : "Loyalty points earned");
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

  const fetchData = async () => {
    try {
      let userId = getStoredUserId();
      let dashboardData = null;

      try {
        dashboardData = await getDashboardData();
        const dashboardUserId = Number(
          dashboardData?.client?.ClientId ||
          dashboardData?.client?.clientId ||
          dashboardData?.client?.id
        );
        if (Number.isFinite(dashboardUserId) && dashboardUserId > 0) {
          userId = dashboardUserId;
          localStorage.setItem("userId", String(userId));
        }
      } catch (dashboardErr) {
        console.warn("Could not resolve authenticated rewards user:", dashboardErr.message);
      }

      const active = await getUserActivePoints(userId);
      const pending = await getUserPendingPoints(userId);
      const all = await getUserPoints(userId);
      const rewardsData = await getAllRewards();

      setActivePoints(Number(dashboardData?.cityPoints ?? active.activePoints ?? 0));
      setPendingPoints(Number(pending.pendingPoints || 0));
      setHistory(
        (Array.isArray(all) ? all : []).map((point) => ({
          id: point.RewardPointId,
          label: cleanPointDescription(point),
          date: new Date(point.createdAt).toLocaleDateString(),
          status: point.status ? point.status.charAt(0).toUpperCase() + point.status.slice(1) : "Active",
          amount: `${point.amount > 0 ? "+" : ""}${point.amount}p`
        }))
      );

      setRewards(Array.isArray(rewardsData) ? rewardsData.filter((reward) => reward.active !== false) : []);

      try {
        const res = await fetch(`${API_BASE_URL}/api/reservations/upcoming/${userId}`);
        if (res.ok) {
          const stay = await res.json();
          const detailsRes = await fetch(`${API_BASE_URL}/api/reservations/${stay.ReservationId}`);
          setUpcomingStay(detailsRes.ok ? await detailsRes.json() : stay);
        }
      } catch {}
    } catch (err) {
      console.error("Error fetching rewards data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [location]);

  useEffect(() => {
    const room = getStayRoom(upcomingStay);
    const theme = getStayTheme(upcomingStay);
    const firstThemeImage = theme?.images?.[0]?.imageUrl;
    setUpcomingStayImage(
      toImageUrl(theme?.showcaseImage || room?.showcaseImage || room?.image || theme?.image || firstThemeImage)
    );
  }, [upcomingStay]);

  const redeemReward = (reward) => {
    sessionStorage.setItem("selectedReward", JSON.stringify(reward));
    navigate("/rewards-details", { state: { reward } });
  };

  const scrollToSelection = () => {
    document.getElementById("rewards-selection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const upcomingRoom = getStayRoom(upcomingStay);
  const upcomingTheme = getStayTheme(upcomingStay);
  const showcaseImage = toImageUrl(rewards.find((reward) => reward.image)?.image) || upcomingStayImage;
  const tierProgress = Math.min(100, Math.round((activePoints / 10000) * 100));

  return (
    <>
      <Navbar />
      <main className="rewards-luxury-page">
        <section className="rewards-intro">
          <p>Loyalty Rewards</p>
          <h1>Redeem your Cityscape points for curated moments, private comforts and memorable stays.</h1>
        </section>

        <section className="rewards-showcase">
          <div className="rewards-balance">
            <p>Your legacy balance</p>
            <h2>{activePoints.toLocaleString()} <span>Points</span></h2>
            {pendingPoints > 0 && (
              <em>{pendingPoints.toLocaleString()} points pending from upcoming stays</em>
            )}
            <div className="rewards-progress">
              <span>Ascension to next tier</span>
              <b>{tierProgress}%</b>
            </div>
            <div className="rewards-progress-bar">
              <span style={{ width: `${tierProgress}%` }} />
            </div>
            <div className="rewards-showcase-actions">
              <button type="button" onClick={scrollToSelection}>View rewards</button>
              <button type="button" className="ghost" onClick={() => navigate("/reservations")}>My stays</button>
            </div>
          </div>

          <div
            className={`rewards-visual ${showcaseImage ? "" : "empty"}`}
            style={showcaseImage ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0), rgba(46,35,21,0.08)), url("${showcaseImage}")` } : undefined}
          >
            <div className="rewards-visual-card">
              <strong>cityscape</strong>
              <em>"Every return should feel remembered."</em>
            </div>
          </div>
        </section>

        {upcomingStay && (
          <section className="rewards-upcoming-strip">
            <div>
              <p>Upcoming Stay</p>
              <h2>{upcomingTheme?.name || upcomingRoom?.RoomName || upcomingRoom?.name || "Your Upcoming Stay"}</h2>
              <span>
                {new Date(upcomingStay.requestedCheckin).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                {" - "}
                {new Date(upcomingStay.requestedCheckout).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <button type="button" onClick={() => navigate(`/reservation/${upcomingStay.ReservationId}`)}>Manage stay</button>
          </section>
        )}

        <section className="rewards-boutique-selection" id="rewards-selection">
          <div className="rewards-ledger-heading">
            <div>
              <p>Selection</p>
              <h2>The Boutique Reward Collection</h2>
            </div>
            <button type="button" onClick={scrollToSelection}>Discover all rewards</button>
          </div>

          {loading ? (
            <div className="rewards-state">Loading rewards...</div>
          ) : rewards.length === 0 ? (
            <div className="rewards-state">No rewards available at the moment.</div>
          ) : (
            <div className="boutique-reward-grid">
              {rewards.map((reward, idx) => (
                <article key={reward.RewardId || idx} className="boutique-reward-card">
                  <div className="boutique-reward-image">
                    {reward.image ? (
                      <img src={toImageUrl(reward.image)} alt={reward.title} />
                    ) : (
                      <div className="reward-image-fallback" />
                    )}
                    <span>{Number(reward.points || 0).toLocaleString()} pts</span>
                  </div>
                  <p>{reward.category || "Reward"}</p>
                  <h3>{reward.title}</h3>
                  <span>{reward.desc}</span>
                  <button
                    type="button"
                    className={activePoints < reward.points ? "disabled" : ""}
                    disabled={activePoints < reward.points}
                    onClick={() => redeemReward(reward)}
                  >
                    {activePoints < reward.points ? "Not enough points" : "Redeem reward"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rewards-history-section">
          <div className="rewards-ledger-heading compact">
            <div>
              <p>Ledger</p>
              <h2>Points History</h2>
            </div>
          </div>
          <div className="history-table-wrapper">
            <table className="rewards-history-table">
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
                    <td colSpan="4" className="empty-history">No transactions yet</td>
                  </tr>
                ) : (
                  history.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td>{item.label}</td>
                      <td>{item.date}</td>
                      <td><span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span></td>
                      <td className="text-right">
                        <span className={`amount ${item.amount.startsWith("+") ? "positive" : "negative"}`}>
                          {item.amount}
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
