import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Gift,
  MapPin,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import Navbar from "../Dashboard/Navbar";
import profilePicture from "../../assets/profilePicture.jpg";
import { getDashboardData } from "../../services/dashboardService";
import { getUserActivePoints } from "../../services/rewardService";
import { API_BASE_URL } from "../../config/runtimeUrls";
import "./ProfilePage.css";

const resolveProfilePicture = (value) => {
  if (!value || typeof value !== "string") return profilePicture;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/assets/")) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return value;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const userId = parseInt(localStorage.getItem("userId")) || 1;
  const [userData, setUserData] = useState(null);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    async function loadUserData() {
      try {
        const data = await getDashboardData();
        setUserData(data);
      } catch (err) {
        console.error("Error loading profile data:", err);
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

  const reservations = useMemo(() => userData?.allReservations || userData?.recentReservations || [], [userData?.allReservations, userData?.recentReservations]);
  const validReservations = useMemo(() => reservations.filter((reservation) => {
    const status = String(reservation.status || "").toLowerCase();
    return !["cancelled", "canceled", "pending"].includes(status);
  }), [reservations]);
  const completedReservations = useMemo(() => reservations.filter((reservation) => {
    const status = String(reservation.status || "").toLowerCase();
    const checkout = reservation.checkOut ? new Date(reservation.checkOut) : null;
    return status === "completed" || (
      !["cancelled", "canceled", "pending"].includes(status) &&
      checkout &&
      checkout < new Date()
    );
  }), [reservations]);
  const user = {
    firstName: userData?.client?.FirstName || "Guest",
    lastName: userData?.client?.LastName || "",
    email: userData?.client?.Email || "guest@cityscape.com",
    level: `${userData?.clientTier?.tip || userData?.client?.TypeClientTip || "Standard"} Tier Member`,
    tier: userData?.clientTier?.tip || userData?.client?.TypeClientTip || "Standard",
    tierBenefits: userData?.clientTier?.benefits || "Basic member access and loyalty points.",
    tierDiscount: Number(userData?.clientTier?.discount || 0),
    completedStayCount: Number(userData?.clientTier?.completedStayCount || 0),
    points: userPoints,
  };

  const favoriteCity = useMemo(() => {
    if (!completedReservations.length) return "No destination yet";
    const cityCounts = completedReservations.reduce((counts, reservation) => {
      const city = reservation.city || "Cityscape";
      counts[city] = (counts[city] || 0) + 1;
      return counts;
    }, {});

    return Object.keys(cityCounts).reduce((favorite, city) => (
      cityCounts[city] > cityCounts[favorite] ? city : favorite
    ));
  }, [completedReservations]);

  const upcomingReservations = validReservations
    .filter(reservation => reservation.status === "upcoming" || reservation.status === "active")
    .slice(0, 3);
  const displayedReservations = upcomingReservations.length ? upcomingReservations : validReservations.slice(0, 3);
  const citiesVisited = new Set(completedReservations.map(reservation => reservation.city).filter(Boolean)).size;
  const totalSpent = completedReservations
    .reduce((sum, reservation) => sum + (parseFloat(reservation.totalAmount) || 0), 0);

  const formatMoney = (value) => `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} EUR`;

  const formatDate = (date) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getStatusLabel = (status) => {
    if (status === "active") return "Active";
    if (status === "upcoming") return "Upcoming";
    if (status === "cancelled") return "Cancelled";
    return "Past";
  };

  return (
    <>
      <Navbar />

      <main className="profile-page profile-collection">
        <aside className="profile-sidebar">
          <div className="profile-portrait">
            <img
              src={resolveProfilePicture(userData?.client?.profilePicture)}
              alt="User avatar"
              onError={(event) => { event.currentTarget.src = profilePicture; }}
            />
          </div>
          <h2>{user.firstName} {user.lastName}</h2>
          <p>{user.level}</p>

          <nav className="profile-side-nav" aria-label="Profile sections">
            <button type="button" className="active" onClick={() => navigate("/reservations")}>
              <CalendarDays size={16} />
              My Stays
            </button>
            <button type="button" onClick={() => navigate("/rewards")}>
              <Gift size={16} />
              Member Rewards
            </button>
            <button type="button" onClick={() => navigate("/services")}>
              <Sparkles size={16} />
              Hotel Services
            </button>
            <button type="button" onClick={() => navigate("/profile/edit")}>
              <Settings size={16} />
              Account Settings
            </button>
          </nav>

          <button className="profile-book-btn" onClick={() => navigate("/booking")}>
            Book New Stay
          </button>
        </aside>

        <section className="profile-content">
          <header className="profile-hero">
            <div>
              <p className="profile-kicker">Archive & Future</p>
              <h1>Your Collection</h1>
              <p className="profile-subtitle">
                Welcome back, {user.firstName}. Revisit your stays, rewards, and favorite Cityscape moments.
              </p>
            </div>
            <button className="profile-edit-action" onClick={() => navigate("/profile/edit")}>
              <UserRound size={16} />
              Edit Profile
            </button>
          </header>

          <section className="profile-summary-strip">
            <div>
              <span>Loyalty Points</span>
              <strong>{user.points.toLocaleString("en-US")}</strong>
            </div>
            <div>
              <span>Stays</span>
              <strong>{validReservations.length}</strong>
            </div>
            <div>
              <span>Cities</span>
              <strong>{citiesVisited}</strong>
            </div>
            <div>
              <span>Favorite</span>
              <strong>{favoriteCity}</strong>
            </div>
          </section>

          <section className="profile-stays-panel">
            <div className="profile-section-heading">
              <div>
                <h2>Upcoming Stays</h2>
              </div>
              <button onClick={() => navigate("/reservations")}>View All</button>
            </div>

            {displayedReservations.length === 0 ? (
              <div className="profile-empty-state">
                <CalendarDays size={28} />
                <h3>No reservations yet</h3>
                <p>Your paid trips will appear here once you complete your first booking.</p>
                <button onClick={() => navigate("/booking")}>Explore Rooms</button>
              </div>
            ) : (
              <div className="profile-stay-list">
                {displayedReservations.map((reservation) => (
                  <article key={reservation.reservationId} className="profile-stay-card">
                    <div
                      className={`profile-stay-visual ${reservation.image ? "has-image" : ""}`}
                      style={reservation.image ? { backgroundImage: `url(${reservation.image})` } : undefined}
                    >
                      <span>{getStatusLabel(reservation.status)}</span>
                      <MapPin size={18} />
                    </div>

                    <div className="profile-stay-details">
                      <p>{reservation.city || "Cityscape Hotel"}</p>
                      <h3>{reservation.room || "Curated Suite"}</h3>
                      <div className="profile-stay-meta">
                        <div>
                          <span>Check-in</span>
                          <strong>{formatDate(reservation.checkIn)}</strong>
                        </div>
                        <div>
                          <span>Check-out</span>
                          <strong>{formatDate(reservation.checkOut)}</strong>
                        </div>
                        <div>
                          <span>Total</span>
                          <strong>{formatMoney(reservation.totalAmount)}</strong>
                        </div>
                      </div>
                      <button onClick={() => navigate(`/reservation/${reservation.reservationId}`)}>
                        View Details
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="profile-insights">
            <div className="profile-insight-card">
              <p>Member Tier</p>
              <h3>{user.tier}</h3>
              <span>
                {user.completedStayCount} completed {user.completedStayCount === 1 ? "stay" : "stays"}
                {user.tierDiscount ? ` · ${user.tierDiscount}% member benefit` : ""}
              </span>
              <button onClick={() => navigate("/rewards")}>Open Rewards</button>
            </div>

            <div className="profile-insight-card muted">
              <p>Total Spend</p>
              <h3>{formatMoney(totalSpent)}</h3>
              <span>A quiet overview of your completed Cityscape journey.</span>
              <button onClick={() => navigate("/reservations")}>See Stays</button>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
