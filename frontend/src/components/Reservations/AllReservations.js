import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "./AllReservations.css";

const USER_ID = parseInt(localStorage.getItem("userId")) || 1;

export default function AllReservations() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const TABS = ["Upcoming", "Active", "Past", "Cancelled"];
  const reservationCounts = TABS.reduce((acc, tab) => {
    const now = new Date();
    let count = 0;
    if (tab === "Upcoming") {
      count = reservations.filter(r => new Date(r.requestedCheckin) > now && ["upcoming", "pending", "partial", "paid"].includes(r.status) && r.RoomReservations?.length > 0).length;
    } else if (tab === "Active") {
      count = reservations.filter(r => r.status === "active" && now >= new Date(r.requestedCheckin) && now < new Date(r.requestedCheckout) && r.RoomReservations?.length > 0).length;
    } else if (tab === "Past") {
      count = reservations.filter(r => {
        const checkoutDate = new Date(r.requestedCheckout);
        return (r.status === "completed" || (checkoutDate <= now && r.status !== "active")) && r.RoomReservations?.length > 0;
      }).length;
    } else if (tab === "Cancelled") {
      count = reservations.filter(r => r.status === "cancelled").length;
    }
    return { ...acc, [tab]: count };
  }, {});

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:9001/api/reservations/user/${USER_ID}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }

      const data = await response.json();
      console.log("=== FULL API RESPONSE ===", data);
      
      const allRes = Array.isArray(data) ? data : data.reservations || [];
      console.log("=== PROCESSED RESERVATIONS ===", allRes);
      
      // Log first reservation details
      if (allRes.length > 0) {
        console.log("=== FIRST RESERVATION DETAILS ===");
        console.log("ReservationId:", allRes[0].ReservationId);
        console.log("Status:", allRes[0].status);
        console.log("RoomReservations:", allRes[0].RoomReservations);
        console.log("Full first res:", JSON.stringify(allRes[0], null, 2));
      }
      
      setReservations(allRes);
      filterReservations(allRes, "Upcoming", "");
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const filterReservations = (res, tab, search) => {
    let filtered = res;

    // Filter by tab status - check actual status values from API
    if (tab === "Upcoming") {
      const now = new Date();
      filtered = filtered.filter(r => {
        const checkinDate = new Date(r.requestedCheckin);
        // Accept status: upcoming, pending, partial, paid (future check-in)
        const validStatuses = ["upcoming", "pending", "partial", "paid"];
        return checkinDate > now && validStatuses.includes(r.status) && r.RoomReservations?.length > 0;
      });
    } else if (tab === "Active") {
      const now = new Date();
      filtered = filtered.filter(r => {
        const checkinDate = new Date(r.requestedCheckin);
        const checkoutDate = new Date(r.requestedCheckout);
        // DOAR status 'active' și între check-in și check-out
        return r.status === "active" && now >= checkinDate && now < checkoutDate && r.RoomReservations?.length > 0;
      });
    } else if (tab === "Past") {
      const now = new Date();
      filtered = filtered.filter(r => {
        const checkoutDate = new Date(r.requestedCheckout);
        // Completed: status 'completed' SAU checkout trecut (dar nu active)
        return (r.status === "completed" || (checkoutDate <= now && r.status !== "active")) && r.RoomReservations?.length > 0;
      });
    } else if (tab === "Cancelled") {
      filtered = filtered.filter(r => r.status === "cancelled");
    }

    // ALSO: Filter out reservations without room data (incomplete bookings)
    filtered = filtered.filter(r => r.RoomReservations?.length > 0);

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r => {
        const roomRes = r.RoomReservations?.[0];
        const room = roomRes?.Room;
        const theme = room?.RoomTheme;
        const city = theme?.city?.toLowerCase() || "";
        const themeName = theme?.name?.toLowerCase() || "";
        const roomName = room?.RoomName?.toLowerCase() || "";
        return city.includes(searchLower) || themeName.includes(searchLower) || roomName.includes(searchLower);
      });
    }

    // Sort by check-in date
    filtered.sort((a, b) => new Date(b.requestedCheckin) - new Date(a.requestedCheckin));

    console.log(`[FILTER] Tab: ${tab}, Total: ${res.length}, Filtered: ${filtered.length}`);
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
    const checkin = new Date(reservation.requestedCheckin);
    const checkout = new Date(reservation.requestedCheckout);
    return Math.max(1, Math.ceil(Math.abs(checkout - checkin) / (1000 * 60 * 60 * 24)));
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: "UPCOMING",
      partial: "UPCOMING",
      paid: "CONFIRMED",
      active: "ACTIVE",
      completed: "COMPLETED",
      cancelled: "CANCELLED"
    };
    return statusMap[status] || status.toUpperCase();
  };

  const getReservationImage = (reservation) => {
    const roomRes = reservation.RoomReservations?.[0];
    const room = roomRes?.Room;
    const theme = room?.RoomTheme;
    
    console.log(`[IMG] Res #${reservation.ReservationId} - RoomRes:`, !!roomRes, "Room:", !!room, "Theme:", !!theme);
    
    // Priority: showcase image > room image > placeholder
    if (theme?.showcaseImage) {
      const url = theme.showcaseImage.startsWith("http")
        ? theme.showcaseImage
        : `http://localhost:9001${theme.showcaseImage}`;
      console.log(`[IMG] Using showcase: ${url}`);
      return url;
    }
    if (room?.image) {
      const url = room.image.startsWith("http")
        ? room.image
        : `http://localhost:9001${room.image}`;
      console.log(`[IMG] Using room.image: ${url}`);
      return url;
    }
    if (theme?.images?.[0]?.imageUrl) {
      const url = theme.images[0].imageUrl.startsWith("http")
        ? theme.images[0].imageUrl
        : `http://localhost:9001${theme.images[0].imageUrl}`;
      return url;
    }
    console.log(`[IMG] Using placeholder`);
    return "https://via.placeholder.com/300x200?text=No+Image";
  };

  const getReservationInfo = (reservation) => {
    const roomRes = reservation.RoomReservations?.[0];
    const room = roomRes?.Room;
    const theme = room?.RoomTheme;
    const invoice = reservation.Invoice;

    const info = {
      roomName: room?.RoomName || theme?.name || "Your Sanctuary",
      city: theme?.city || "DESTINATION",
      themeName: theme?.name || "",
      totalAmount: invoice?.totalAmount || room?.RoomTheme?.basePrice || 0
    };
    
    console.log(`[INFO] Res #${reservation.ReservationId}:`, info);
    return info;
  };

  return (
    <>
      <Navbar />
      <main className="all-reservations-page">
        {/* HEADER */}
        <section className="reservations-header">
          <div className="header-content">
            <h1 className="header-title">Your Stays</h1>
            <p className="header-subtitle">
              Welcome back. Revisit the sanctuaries you've inhabited and manage your upcoming journeys across our global portfolio.
            </p>
          </div>
        </section>

        {/* TABS & SEARCH */}
        <section className="reservations-controls">
          <div className="tabs-container">
            {TABS.map(tab => (
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

        {/* RESERVATIONS GRID */}
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
              {filteredReservations.map(res => {
                const info = getReservationInfo(res);
                const image = getReservationImage(res);
                
                return (
                  <div key={res.ReservationId} className="reservation-card">
                    {/* Card Image */}
                    <div className="card-image-container">
                      <img
                        src={image}
                        alt={info.roomName}
                        className="card-image"
                      />
                      <span className="status-badge">{getStatusBadge(res.status)}</span>
                    </div>

                    {/* Card Content */}
                    <div className="card-content">
                      <h3 className="card-title">{info.roomName}</h3>
                      <p className="card-location">
                        {info.city?.toUpperCase()} {info.themeName ? "- " + info.themeName : ""}
                      </p>

                      {/* Price */}
                      <p className="card-price">
                        €{(info.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="price-label">TOTAL STAY</span>
                      </p>

                      {/* Dates */}
                      <div className="card-dates">
                        <span>{formatDate(res.requestedCheckin)}</span>
                        <span className="date-separator">-</span>
                        <span>{formatDate(res.requestedCheckout)}</span>
                      </div>

                      <div className="card-meta-row">
                        <span>{getNights(res)} {getNights(res) === 1 ? "night" : "nights"}</span>
                        <span>{res.nrPeople || 1} {(res.nrPeople || 1) === 1 ? "guest" : "guests"}</span>
                      </div>

                      {/* Tags */}
                      {(info.city || info.themeName) && (
                        <div className="card-tags">
                          {info.city && <span className="tag">{info.city}</span>}
                          {info.themeName && <span className="tag">{info.themeName}</span>}
                        </div>
                      )}

                      {/* Actions */}
                      <button
                        className="view-details-btn"
                        onClick={() => navigate(`/reservation/${res.ReservationId}`)}
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
