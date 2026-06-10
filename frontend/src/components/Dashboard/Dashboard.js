import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BedDouble, ChevronRight, Sparkles, UtensilsCrossed, Waves } from "lucide-react";
import { getDashboardData } from "../../services/dashboardService";
import Navbar from "./Navbar";
import "./Dashboard.css";

const formatShortDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getTierName = (clientTier) => {
  if (!clientTier) return "Member";
  return clientTier.name || clientTier.tierName || clientTier.currentTier || "Member";
};

const getClientFirstName = (client) => {
  const apiName = client?.FirstName || client?.firstName || client?.name;
  if (apiName && String(apiName).trim()) return String(apiName).trim().split(" ")[0];

  const storedName = localStorage.getItem("userName");
  if (storedName && storedName.trim()) return storedName.trim().split(" ")[0];

  return "Guest";
};

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

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const upcomingStays = useMemo(() => {
    return (data?.allReservations || [])
      .filter((reservation) => {
        const checkIn = new Date(reservation.checkIn);
        checkIn.setHours(0, 0, 0, 0);
        const status = String(reservation.status || "").toLowerCase();
        return checkIn > today && !["cancelled", "canceled", "completed", "past"].includes(status);
      })
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  }, [data?.allReservations, today]);

  const featuredStay = data?.nextDestination || upcomingStays[0] || null;
  const collectionSource = data?.recentReservations?.some((reservation) => reservation.image)
    ? data.recentReservations
    : data?.boutiqueCollections?.length
      ? data.boutiqueCollections
      : data?.allReservations || [];
  const collectionRooms = collectionSource
    .filter((reservation) => reservation.image)
    .slice(0, 2);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <main className="dashboard">
          <section className="dashboard-error-card">
            <h2>Dashboard unavailable</h2>
            <p>Could not load user data.</p>
          </section>
        </main>
      </>
    );
  }

  const firstName = getClientFirstName(data?.client);
  const points = Number(data?.cityPoints || 0);
  const tierName = getTierName(data?.clientTier);
  const progress = Math.min(98, Math.max(12, Math.round((points % 10000) / 100)));

  return (
    <>
      <Navbar />

      <main className="dashboard">
        <section className="dashboard-hero">
          <span className="hero-rule" />
          <h1>Welcome back, {firstName}!</h1>
          <p>Plan your next stay or manage your reservations.</p>
          <div className="hero-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="dashboard-layout">
          <aside className="dashboard-sidebar">
            <div className="points-panel">
              <div className="eyebrow-row">
                <span>City Points</span>
                <small>{tierName}</small>
              </div>
              <div className="points-number">{points.toLocaleString("en-US")}</div>
              <div className="credits-label">credits</div>
              <div className="tier-row">
                <span>Tier progress</span>
                <strong>{progress}%</strong>
              </div>
              <div className="tier-track">
                <span style={{ width: `${progress}%` }} />
              </div>
              <button type="button" className="outline-pill" onClick={() => navigate("/rewards")}>
                Explore rewards
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="services-menu">
              <p>Services</p>
              <button type="button" onClick={() => navigate("/booking")}>
                <BedDouble size={18} />
                <span>Private Stay</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => navigate("/services")}>
                <Waves size={18} />
                <span>Wellness & Spa</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => navigate("/services")}>
                <UtensilsCrossed size={18} />
                <span>Private Dining</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </aside>

          <section className="dashboard-main">
            <div className="section-heading">
              <h2>Upcoming Stays</h2>
              <button type="button" onClick={() => navigate("/reservations")}>
                View all reservations
              </button>
            </div>

            {featuredStay ? (
              <article className="featured-stay">
                <div
                  className={`featured-image ${featuredStay.image ? "" : "empty"}`}
                  style={featuredStay.image ? { backgroundImage: `url(${featuredStay.image})` } : undefined}
                >
                  <span className="status-chip">Confirmed</span>
                </div>
                <div className="featured-details">
                  <p className="city-label">{featuredStay.city || "Cityscape"}</p>
                  <h3>{featuredStay.room || "Your next stay"}</h3>
                  <span className="address-line">Curated stay by Cityscape Hotel</span>
                  <div className="stay-meta-grid">
                    <div>
                      <span>Check-in</span>
                      <strong>{formatShortDate(featuredStay.checkIn)}</strong>
                    </div>
                    <div>
                      <span>Check-out</span>
                      <strong>{formatShortDate(featuredStay.checkOut)}</strong>
                    </div>
                    <div>
                      <span>Guests</span>
                      <strong>{String(featuredStay.guests || 1).padStart(2, "0")}</strong>
                    </div>
                  </div>
                  <div className="stay-actions">
                    <button type="button" className="solid-pill" onClick={() => navigate("/services")}>
                      Concierge desk
                    </button>
                    <button
                      type="button"
                      className="outline-pill compact"
                      onClick={() => navigate(`/reservation/${featuredStay.reservationId}`)}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <div className="no-stay-card">
                <Sparkles size={22} />
                <h3>No upcoming stays</h3>
                <p>Your next reservation will appear here once you choose a room.</p>
                <button type="button" className="solid-pill" onClick={() => navigate("/booking")}>
                  Book a stay
                </button>
              </div>
            )}

            <div className="section-heading collections-heading">
              <h2>Boutique Collections</h2>
              <button type="button" onClick={() => navigate("/explore")}>View all collections</button>
            </div>

            <div className="collections-grid">
              {(collectionRooms.length ? collectionRooms : [
                { room: "Tokyo Neo-Saito", city: "Immersive sanctuary", pricePerNight: 750 },
                { room: "NYC Loft Central", city: "Skyline hideaway", pricePerNight: 890 }
              ]).map((room, index) => (
                <article
                  key={`${room.reservationId || room.room}-${index}`}
                  className={`collection-card ${room.image ? "" : "fallback"}`}
                  style={room.image ? { backgroundImage: `url(${room.image})` } : undefined}
                >
                  <div>
                    <p>{room.city || "Cityscape"}</p>
                    <h3>{room.room || "Signature Suite"}</h3>
                  </div>
                  <div className="collection-footer">
                    <span>{index === 0 ? "Zen elegance meets city light" : "Industrial heritage, refined living"}</span>
                    <strong>{Number(room.pricePerNight || 0).toLocaleString("en-US")} EUR <small>/ night</small></strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
