import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  Pencil,
  ShieldCheck,
  Users
} from "lucide-react";
import Navbar from "../Dashboard/Navbar";
import "./ServiceBooking.css";
import { isValidEmail, isValidPersonName } from "../../utils/validators";
import { API_BASE_URL } from "../../config/runtimeUrls";
import { getDashboardData } from "../../services/dashboardService";

const getStoredUserId = () => {
  const value = parseInt(localStorage.getItem("userId"), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

const toImageUrl = (path) => {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const getServiceName = (service) => service?.serviceName || service?.name || "Selected Service";
const formatDate = (date, options) => new Date(date).toLocaleDateString("en-US", options);
const formatReservationRef = (id) => `BK-${String(id || "").padStart(4, "0")}`;

export default function ServiceBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const service = location.state?.service || (() => {
    try {
      return JSON.parse(sessionStorage.getItem("selectedService") || "null");
    } catch {
      return null;
    }
  })();
  const isPerPerson = service?.priceType === "per_person";

  const [upcomingStays, setUpcomingStays] = useState([]);
  const [selectedStay, setSelectedStay] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [personDetails, setPersonDetails] = useState([{ name: "", email: "" }]);

  useEffect(() => {
    async function fetchStays() {
      setLoading(true);
      try {
        let userId = getStoredUserId();

        try {
          const dashboardData = await getDashboardData();
          setClient(dashboardData?.client || null);
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
          console.warn("Could not resolve authenticated service booking user:", dashboardErr.message);
        }

        const res = await fetch(`${API_BASE_URL}/api/reservations?userId=${userId}`);
        if (res.ok) {
          const reservations = await res.json();
          const now = new Date();
          const upcoming = reservations
            .filter((reservation) => new Date(reservation.requestedCheckin) > now && reservation.status !== "cancelled")
            .sort((a, b) => new Date(a.requestedCheckin) - new Date(b.requestedCheckin));
          setUpcomingStays(upcoming);
        } else {
          setUpcomingStays([]);
        }
      } catch {
        setUpcomingStays([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStays();
  }, []);

  if (!service) {
    return (
      <>
        <Navbar />
        <main className="service-booking-page">
          <section className="service-booking-empty">
            <p>No service selected.</p>
            <button type="button" onClick={() => navigate("/services")}>
              Back to Services
            </button>
          </section>
        </main>
      </>
    );
  }

  const servicePrice = parseFloat(service.price) || 0;
  const selectedStayGuestLimit = selectedStay?.nrPeople || 1;
  const selectedPersonCount = isPerPerson ? personDetails.length : 1;
  const serviceTotal = servicePrice * selectedPersonCount;
  const serviceName = getServiceName(service);
  const serviceImage = toImageUrl(service.image);
  const selectedRoom = selectedStay?.RoomReservations?.[0]?.Room;
  const selectedTheme = selectedRoom?.RoomTheme;
  const clientName = [client?.FirstName || client?.firstName, client?.LastName || client?.lastName].filter(Boolean).join(" ") || localStorage.getItem("userName") || "Cityscape Guest";
  const clientEmail = client?.Email || client?.email || "guest@cityscape.com";
  const clientPhone = client?.Phone || client?.phone || client?.phoneNumber || "+40 000 000 000";

  const handleSelectStay = (stay) => {
    setSelectedStay(stay);
    const maxGuests = stay?.nrPeople || 1;
    setPersonDetails((prev) => {
      const current = prev.length ? prev : [{ name: "", email: "" }];
      return current.slice(0, maxGuests);
    });
  };

  const handlePersonChange = (idx, field, value) => {
    setPersonDetails((prev) => prev.map((person, i) => (
      i === idx ? { ...person, [field]: value } : person
    )));
  };

  const handleAddPerson = () => {
    if (!selectedStay || personDetails.length >= selectedStayGuestLimit) return;
    setPersonDetails((prev) => [...prev, { name: "", email: "" }]);
  };

  const handleRemovePerson = (idx) => {
    setPersonDetails((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    if (!selectedStay) {
      alert("Please select a stay");
      return;
    }

    if (isPerPerson) {
      const hasInvalidPerson = personDetails.some((person) => (
        !isValidPersonName(person.name) || !isValidEmail(person.email)
      ));

      if (hasInvalidPerson) {
        alert("Please add a valid full name and email for each person.");
        return;
      }
    }

    setConfirming(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservation-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: selectedStay.ReservationId,
          serviceId: service.ServiceId,
          quantity: selectedPersonCount,
          unitPrice: servicePrice,
          personDetails: isPerPerson ? personDetails : null
        })
      });

      if (res.ok) {
        setSuccessMessage("Service added to your reservation. Payment will be collected at checkout.");
        setTimeout(() => {
          navigate(`/reservation/${selectedStay.ReservationId}`);
        }, 2200);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "Error adding service");
      }
    } catch {
      alert("Could not add this service. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="service-booking-page">
        <section
          className={`service-booking-hero ${serviceImage ? "" : "empty"}`}
          style={serviceImage ? { backgroundImage: `linear-gradient(90deg, rgba(18, 16, 12, 0.74), rgba(18, 16, 12, 0.42)), url("${serviceImage}")` } : undefined}
        >
          <div className="service-hero-content">
            <p>{service.category || "Premium Service"}</p>
            <h1>{serviceName}</h1>
            <span>{service.description || "Enhance your stay with a curated Cityscape experience."}</span>
            <div className="service-hero-actions">
              <div>
                <small>{isPerPerson ? "Investment / person" : "Investment / booking"}</small>
                <strong>{servicePrice.toFixed(2)} EUR</strong>
              </div>
              <button type="button" onClick={() => document.getElementById("booking-flow")?.scrollIntoView({ behavior: "smooth" })}>
                Reserve experience
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <section className="service-booking-content" id="booking-flow">
          <div className="booking-timeline" aria-hidden="true" />

          <div className="service-booking-main">
            <section className="booking-step">
              <div className="step-marker">1</div>
              <div className="step-copy">
                <h2>Selected Service</h2>
                <p>Confirm your preferred experience before selecting a stay.</p>
              </div>
              <article className="selected-service-row">
                <img src={serviceImage || "/logo192.png"} alt={serviceName} />
                <div className="selected-service-copy">
                  <h3>{serviceName}</h3>
                  <p>{service.description || "Curated Cityscape experience"}</p>
                  <div className="selected-service-meta">
                    <span><Clock3 size={14} /> Upon request</span>
                    <span><Users size={14} /> {isPerPerson ? `Max ${selectedStayGuestLimit} guests` : "Private booking"}</span>
                  </div>
                </div>
                <button type="button" onClick={() => navigate("/services")}>
                  Modify
                  <Pencil size={13} />
                </button>
              </article>
            </section>

            <section className="booking-step">
              <div className="step-marker">2</div>
              <div className="step-header-row">
                <div className="step-copy">
                  <h2>Choose Reservation</h2>
                  <p>Associate this experience with one of your active stays.</p>
                </div>
                <button type="button" className="all-stays-link" onClick={() => navigate("/reservations")}>
                  All reservations
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="stays-selection">
                {loading ? (
                  <div className="stays-empty">
                    <p>Loading your stays...</p>
                  </div>
                ) : upcomingStays.length === 0 ? (
                  <div className="stays-empty">
                    <p>No upcoming stays found.</p>
                    <span>Book a room to add services to your reservation.</span>
                    <button type="button" onClick={() => navigate("/booking")} className="empty-action">
                      Book a Stay
                    </button>
                  </div>
                ) : (
                  upcomingStays.map((stay) => {
                    const roomRes = Array.isArray(stay.RoomReservations) && stay.RoomReservations.length > 0 ? stay.RoomReservations[0] : null;
                    const room = roomRes?.Room;
                    const theme = room?.RoomTheme;
                    const isSelected = selectedStay?.ReservationId === stay.ReservationId;
                    const checkIn = new Date(stay.requestedCheckin);
                    const checkOut = new Date(stay.requestedCheckout);

                    return (
                      <button
                        type="button"
                        key={stay.ReservationId}
                        className={`stay-option ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectStay(stay)}
                      >
                        <div className="stay-date-tile">
                          <span>{formatDate(checkIn, { month: "short" })}</span>
                          <strong>{formatDate(checkIn, { day: "2-digit" })}-{formatDate(checkOut, { day: "2-digit" })}</strong>
                        </div>
                        <div className="stay-option-body">
                          <div className="stay-option-title-row">
                            <h3>{theme?.name || room?.RoomName || "Your Room"}</h3>
                          </div>
                          <div className="stay-option-meta">
                            <span><MapPin size={14} /> {theme?.city || "Cityscape"}</span>
                            <span><Users size={14} /> {stay.nrPeople || 1} guest{(stay.nrPeople || 1) > 1 ? "s" : ""}</span>
                            <span>{formatReservationRef(stay.ReservationId)}</span>
                          </div>
                        </div>
                        <div className="stay-selected-icon">
                          {isSelected ? <Check size={19} /> : <ChevronRight size={20} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="booking-step">
              <div className="step-marker muted">3</div>
              <div className="step-copy">
                <h2>{isPerPerson ? "Guest Details" : "Contact Details"}</h2>
                <p>{isPerPerson ? "Information required to confirm each participant." : "Information used for the reservation confirmation."}</p>
              </div>

              {isPerPerson ? (
                <div className="service-person-list">
                  <button
                    className="service-add-person"
                    type="button"
                    onClick={handleAddPerson}
                    disabled={!selectedStay || personDetails.length >= selectedStayGuestLimit}
                  >
                    Add person
                  </button>
                  {personDetails.map((person, idx) => (
                    <div className="service-person-row" key={idx}>
                      <div className="service-person-field">
                        <label>Full name</label>
                        <input
                          type="text"
                          value={person.name}
                          onChange={(event) => handlePersonChange(idx, "name", event.target.value)}
                          placeholder="Full Name"
                        />
                      </div>
                      <div className="service-person-field">
                        <label>Email address</label>
                        <input
                          type="email"
                          value={person.email}
                          onChange={(event) => handlePersonChange(idx, "email", event.target.value)}
                          placeholder="Email Address"
                        />
                      </div>
                      {personDetails.length > 1 && (
                        <button
                          className="service-remove-person"
                          type="button"
                          title="Remove person"
                          onClick={() => handleRemovePerson(idx)}
                        >
                          &minus;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="contact-card">
                  <div className="contact-field">
                    <label>Full name</label>
                    <strong>{clientName}</strong>
                  </div>
                  <div className="contact-field">
                    <label>Email address</label>
                    <strong>{clientEmail}</strong>
                  </div>
                  <div className="contact-field">
                    <label>Phone number</label>
                    <strong>{clientPhone}</strong>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="service-booking-sidebar">
            <div className="booking-summary-card">
              <h3>Reservation Summary</h3>

              <div className="summary-block">
                <p>Selected services</p>
                <div className="summary-line">
                  <span>
                    <strong>{serviceName}</strong>
                    <small>x{selectedPersonCount} {isPerPerson ? "person" : "booking"}</small>
                  </span>
                  <b>{serviceTotal.toFixed(2)} EUR</b>
                </div>
              </div>

              {selectedStay && (
                <div className="summary-block">
                  <p>Stay details</p>
                  <div className="summary-stay">
                    <CalendarDays size={15} />
                    <span>{selectedTheme?.name || selectedRoom?.RoomName || "Selected stay"}</span>
                  </div>
                </div>
              )}

              <div className="summary-total">
                <span>Total estimate</span>
                <strong>{serviceTotal.toFixed(2)} EUR</strong>
              </div>

              <button
                className="summary-btn"
                type="button"
                onClick={handleConfirm}
                disabled={confirming || !selectedStay || (isPerPerson && personDetails.length < 1)}
              >
                {confirming ? "Adding Service..." : "Add to Reservation"}
              </button>

              <div className="secure-note"><ShieldCheck size={14} /> Secure transaction</div>

              <p className="summary-note">Payment is collected at reception or checkout. This service will be added to the final room folio.</p>

              {successMessage && <div className="summary-success">{successMessage}</div>}
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
