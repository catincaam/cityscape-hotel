import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import { getDashboardData } from "../../services/dashboardService";
import { API_BASE_URL } from "../../config/runtimeUrls";
import "./AllReservations.css";

export default function AllReservations() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const TABS = ["Upcoming", "Active", "Past", "Cancelled"];

  const startOfDay = (value) => {
    const date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getCheckIn = (reservation) => reservation.requestedCheckin || reservation.checkIn;
  const getCheckOut = (reservation) => reservation.requestedCheckout || reservation.checkOut;
  const getReservationId = (reservation) => reservation.ReservationId || reservation.reservationId;
  const toNumber = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const calculateNights = (reservation) => {
    const checkin = new Date(getCheckIn(reservation));
    const checkout = new Date(getCheckOut(reservation));
    if (Number.isNaN(checkin.getTime()) || Number.isNaN(checkout.getTime())) return 1;
    return Math.max(1, Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24)));
  };

  const getPrimaryTheme = (reservation) => {
    const roomRes = reservation.RoomReservations?.[0];
    return roomRes?.Room?.RoomTheme || null;
  };

  const getReservationTotal = (reservation) => {
    const invoiceTotal = toNumber(
      reservation.totalAmount
      ?? reservation.Invoice?.totalAmount
      ?? reservation.invoice?.totalAmount
      ?? reservation.Invoices?.[0]?.totalAmount
    );
    if (invoiceTotal > 0) return invoiceTotal;

    const theme = getPrimaryTheme(reservation);
    const nightlyRate = toNumber(theme?.basePrice || theme?.price || reservation.pricePerNight);
    if (!nightlyRate) return 0;

    return nightlyRate * calculateNights(reservation);
  };

  const getPayments = (reservation) => (
    reservation.Invoice?.payments
    || reservation.Invoice?.Payments
    || reservation.invoice?.payments
    || reservation.invoice?.Payments
    || reservation.Invoices?.[0]?.payments
    || reservation.Invoices?.[0]?.Payments
    || []
  );

  const getTotalPaid = (reservation) => {
    return getPayments(reservation).reduce((sum, payment) => {
      return sum + toNumber(payment.amount ?? payment.Amount);
    }, 0);
  };

  const hasPaymentDeadlinePassed = (reservation) => {
    const checkInValue = getCheckIn(reservation);
    if (!checkInValue) return false;

    const status = String(reservation.status || "").toLowerCase();
    if (status === "cancelled" || status === "canceled") return false;

    const total = getReservationTotal(reservation);
    const remaining = Math.max(0, total - getTotalPaid(reservation));
    if (total <= 0 || remaining <= 0) return false;

    const checkIn = new Date(checkInValue);
    if (Number.isNaN(checkIn.getTime())) return false;

    const hoursUntilCheckin = (checkIn.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilCheckin < 24;
  };

  const getTimelineStatus = (reservation) => {
    const status = String(reservation.status || "").toLowerCase();
    if (status === "cancelled" || status === "canceled") return "Cancelled";
    if (hasPaymentDeadlinePassed(reservation)) return "Cancelled";
    if (status === "completed") return "Past";

    const today = startOfDay(new Date());
    const checkIn = startOfDay(getCheckIn(reservation));
    const checkOut = startOfDay(getCheckOut(reservation));

    if (checkOut < today) return "Past";
    if (checkIn <= today && checkOut >= today) return "Active";
    if (checkIn > today) return "Upcoming";
    return "Past";
  };

  const getReservationInfo = (reservation) => {
    if (reservation.room || reservation.city) {
      return {
        roomName: reservation.room || "Your Sanctuary",
        city: reservation.city || "Destination",
        themeName: reservation.themeName || "",
        totalAmount: getReservationTotal(reservation)
      };
    }

    const roomRes = reservation.RoomReservations?.[0];
    const room = roomRes?.Room;
    const theme = room?.RoomTheme;

    return {
      roomName: room?.RoomName || theme?.name || "Your Sanctuary",
      city: theme?.city || "Destination",
      themeName: theme?.name || "",
      totalAmount: getReservationTotal(reservation)
    };
  };

  const reservationCounts = TABS.reduce((acc, tab) => {
    acc[tab] = reservations.filter((reservation) => getTimelineStatus(reservation) === tab).length;
    return acc;
  }, {});

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const data = await getDashboardData();
      const allRes = Array.isArray(data?.allReservations) ? data.allReservations : [];
      setReservations(allRes);
      filterReservations(allRes, "Upcoming", "");
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setReservations([]);
      setFilteredReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const filterReservations = (res, tab, search) => {
    let filtered = res.filter((reservation) => getTimelineStatus(reservation) === tab);

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((reservation) => {
        const info = getReservationInfo(reservation);
        return (
          info.city.toLowerCase().includes(searchLower) ||
          info.themeName.toLowerCase().includes(searchLower) ||
          info.roomName.toLowerCase().includes(searchLower)
        );
      });
    }

    filtered.sort((a, b) => {
      const aDate = new Date(getCheckIn(a));
      const bDate = new Date(getCheckIn(b));
      return tab === "Upcoming" ? aDate - bDate : bDate - aDate;
    });

    setFilteredReservations(filtered);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    filterReservations(reservations, tab, searchTerm);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    filterReservations(reservations, activeTab, value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  const getNights = (reservation) => {
    return calculateNights(reservation);
  };

  const getStatusBadge = (reservation) => {
    return getTimelineStatus(reservation).toUpperCase();
  };

  const getReservationImage = (reservation) => {
    if (reservation.image) return reservation.image;

    const roomRes = reservation.RoomReservations?.[0];
    const room = roomRes?.Room;
    const theme = room?.RoomTheme;

    if (theme?.showcaseImage) {
      return theme.showcaseImage.startsWith("http")
        ? theme.showcaseImage
        : `${API_BASE_URL}${theme.showcaseImage}`;
    }

    if (room?.image) {
      return room.image.startsWith("http") ? room.image : `${API_BASE_URL}${room.image}`;
    }

    if (theme?.images?.[0]?.imageUrl) {
      return theme.images[0].imageUrl.startsWith("http")
        ? theme.images[0].imageUrl
        : `${API_BASE_URL}${theme.images[0].imageUrl}`;
    }

    return "https://via.placeholder.com/300x200?text=No+Image";
  };

  return (
    <>
      <Navbar />
      <main className="all-reservations-page">
        <section className="reservations-header">
          <div className="header-content">
            <h1 className="header-title">Your Stays</h1>
            <p className="header-subtitle">
              Welcome back. Revisit the sanctuaries you've inhabited and manage your upcoming journeys across our global portfolio.
            </p>
          </div>
        </section>

        <section className="reservations-controls">
          <div className="tabs-container">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`tab-button ${activeTab === tab ? "active" : ""}`}
                onClick={() => handleTabChange(tab)}
              >
                <span>{tab}</span>
                <strong>{reservationCounts[tab] || 0}</strong>
              </button>
            ))}
          </div>

          <div className="search-container">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by city or stay name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </section>

        <section className="reservations-grid-section">
          {loading ? (
            <p className="loading-text">Loading your stays...</p>
          ) : filteredReservations.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No {activeTab.toLowerCase()} stays</p>
              <p className="empty-subtitle">
                {activeTab === "Upcoming" && "You don't have any upcoming reservations. Ready to book?"}
                {activeTab === "Active" && "No active stays at the moment."}
                {activeTab === "Past" && "You haven't completed any stays yet."}
                {activeTab === "Cancelled" && "No cancelled reservations."}
              </p>
              {activeTab === "Upcoming" && (
                <button className="book-btn" onClick={() => navigate("/booking")}>
                  Book a Stay
                </button>
              )}
            </div>
          ) : (
            <div className="reservations-grid">
              {filteredReservations.map((reservation) => {
                const info = getReservationInfo(reservation);
                const image = getReservationImage(reservation);
                const reservationId = getReservationId(reservation);
                const guests = reservation.guests || reservation.nrPeople || 1;

                return (
                  <div key={reservationId} className="reservation-card">
                    <div className="card-image-container">
                      <img src={image} alt={info.roomName} className="card-image" />
                      <span className="status-badge">{getStatusBadge(reservation)}</span>
                    </div>

                    <div className="card-content">
                      <h3 className="card-title">{info.roomName}</h3>
                      <p className="card-location">
                        {info.city?.toUpperCase()} {info.themeName ? "- " + info.themeName : ""}
                      </p>

                      <p className="card-price">
                        EUR {info.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="price-label">TOTAL STAY</span>
                      </p>

                      <div className="card-dates">
                        <span>{formatDate(getCheckIn(reservation))}</span>
                        <span className="date-separator">-</span>
                        <span>{formatDate(getCheckOut(reservation))}</span>
                      </div>

                      <div className="card-meta-row">
                        <span>
                          {getNights(reservation)} {getNights(reservation) === 1 ? "night" : "nights"}
                        </span>
                        <span>
                          {guests} {guests === 1 ? "guest" : "guests"}
                        </span>
                      </div>

                      {(info.city || info.themeName) && (
                        <div className="card-tags">
                          {info.city && <span className="tag">{info.city}</span>}
                          {info.themeName && <span className="tag">{info.themeName}</span>}
                        </div>
                      )}

                      <button
                        className="view-details-btn"
                        onClick={() => navigate(`/reservation/${reservationId}`)}
                      >
                        VIEW DETAILS
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
