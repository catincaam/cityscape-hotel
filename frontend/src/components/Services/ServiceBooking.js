import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "../Rewards/Rewards.css";
import "./ServiceBooking.css";
import { isValidEmail, isValidPersonName } from "../../utils/validators";

export default function ServiceBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const [upcomingStays, setUpcomingStays] = useState([]);
  const [selectedStay, setSelectedStay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [personDetails, setPersonDetails] = useState([{ name: "", email: "" }]);
  const USER_ID = parseInt(localStorage.getItem("userId")) || 1;
  const service = location.state?.service;
  const isPerPerson = service?.priceType === "per_person";

  useEffect(() => {
    async function fetchStays() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:9001/api/reservations?userId=${USER_ID}`);
        if (res.ok) {
          const reservations = await res.json();
          const now = new Date();
          const upcoming = reservations
            .filter(r => new Date(r.requestedCheckin) > now && r.status !== 'cancelled')
            .sort((a, b) => new Date(a.requestedCheckin) - new Date(b.requestedCheckin));
          setUpcomingStays(upcoming.length ? upcoming : []);
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
  }, [USER_ID]);

  if (!service) {
    return (
      <>
        <Navbar />
        <main className="rewards-luxury-page">
          <section className="luxury-sanctuary" style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: '#999', fontSize: 18 }}>No service selected</p>
            <button 
              className="luxury-redeem-btn" 
              onClick={() => navigate("/services")}
              style={{ marginTop: 20 }}
            >
              ← Back to Services
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

  const handleSelectStay = (stay) => {
    setSelectedStay(stay);
    const maxGuests = stay?.nrPeople || 1;
    setPersonDetails(prev => {
      const current = prev.length ? prev : [{ name: "", email: "" }];
      return current.slice(0, maxGuests);
    });
  };

  const handlePersonChange = (idx, field, value) => {
    setPersonDetails(prev => prev.map((person, i) => (
      i === idx ? { ...person, [field]: value } : person
    )));
  };

  const handleAddPerson = () => {
    if (!selectedStay || personDetails.length >= selectedStayGuestLimit) return;
    setPersonDetails(prev => [...prev, { name: "", email: "" }]);
  };

  const handleRemovePerson = (idx) => {
    setPersonDetails(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    if (!selectedStay) {
      alert("Please select a stay");
      return;
    }
    if (isPerPerson) {
      const hasInvalidPerson = personDetails.some(person => (
        !isValidPersonName(person.name) || !isValidEmail(person.email)
      ));
      if (hasInvalidPerson) {
        alert("Please add a valid full name and email for each person.");
        return;
      }
    }
    setConfirming(true);
    try {
      // POST to backend to add service to reservation
      const res = await fetch("http://localhost:9001/api/reservation-services", {
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
        setSuccessMessage("Service added to reservation! Payment will be made at checkout.");
        setTimeout(() => {
          navigate(`/reservation/${selectedStay.ReservationId}`);
        }, 2200);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "Error adding service");
      }
    } catch {
      alert("Eroare la adăugarea serviciului");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="rewards-luxury-page service-booking-page">
        {/* HEADER SECTION */}
        <section className="luxury-sanctuary">
          <div className="sanctuary-label">ADD SERVICE TO YOUR STAY</div>
          <p className="sanctuary-subtitle">
            Enhance your experience with our premium services. Payment will be collected at checkout.
          </p>
        </section>

        {/* CONTENT: Two-column layout */}
        <section className="service-booking-content">
          {/* LEFT COLUMN: Service Details & Stay Selection */}
          <div className="service-booking-main">
            {/* I. Selected Service */}
            <div className="booking-section">
              <h3 className="booking-section-title">
                <span className="section-number">I.</span> Selected Service
              </h3>
              <div className="luxury-reward-card service-card-large">
                <div 
                  className="reward-card-image"
                  style={{ 
                    backgroundImage: service.image 
                      ? `url('http://localhost:9001${service.image}')` 
                      : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                    minHeight: '280px'
                  }}
                >
                  <div className="reward-card-cost">{servicePrice.toFixed(2)} EUR</div>
                </div>
                <div className="luxury-reward-content">
                  <h4 className="reward-title">{service.serviceName || service.name}</h4>
                  <p className="reward-desc">{service.description}</p>
                  <div className="service-meta-row">
                    <div className="service-category-badge">{service.category}</div>
                    <span className="service-price-type-badge">
                      {isPerPerson ? "PER PERSON" : "PER BOOKING"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* II. Select Upcoming Stay */}
            <div className="booking-section">
              <h3 className="booking-section-title">
                <span className="section-number">II.</span> Select Your Stay
              </h3>
              <div className="stays-selection">
                {loading ? (
                  <div className="stays-empty">
                    <p>Loading your stays...</p>
                  </div>
                ) : upcomingStays.length === 0 ? (
                  <div className="stays-empty">
                    <p>No upcoming stays found.</p>
                    <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                      Book a room to add services to your reservation.
                    </p>
                    <button 
                      onClick={() => navigate("/booking")}
                      className="luxury-redeem-btn"
                      style={{ marginTop: '16px' }}
                    >
                      Book a Stay
                    </button>
                  </div>
                ) : (
                  upcomingStays.map(stay => {
                    const roomRes = Array.isArray(stay.RoomReservations) && stay.RoomReservations.length > 0 
                      ? stay.RoomReservations[0] 
                      : null;
                    const room = roomRes?.Room;
                    const theme = room?.RoomTheme;
                    const isSelected = selectedStay && selectedStay.ReservationId === stay.ReservationId;
                    const checkIn = new Date(stay.requestedCheckin);
                    const checkOut = new Date(stay.requestedCheckout);
                    
                    return (
                      <div
                        key={stay.ReservationId}
                        className={`stay-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectStay(stay)}
                      >
                        <div className="stay-option-header">
                          <div>
                            <h4 className="stay-room-name">{room?.RoomName || 'Your Room'}</h4>
                            <p className="stay-room-theme">{theme?.city || ''} — {theme?.name || ''}</p>
                          </div>
                          {isSelected && <span className="stay-selected-badge">✓ SELECTED</span>}
                        </div>
                        <div className="stay-option-dates">
                          <span>{checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="stay-guests">{stay.nrPeople || 1} guest{(stay.nrPeople || 1) > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {isPerPerson && (
              <div className="booking-section">
                <h3 className="booking-section-title service-person-title">
                  <span className="section-number">III.</span> Person Details
                  <button
                    className="service-add-person"
                    type="button"
                    onClick={handleAddPerson}
                    disabled={!selectedStay || personDetails.length >= selectedStayGuestLimit}
                  >
                    + ADD PERSON
                  </button>
                </h3>
                <div className="service-person-list">
                  {personDetails.map((person, idx) => (
                    <div className="service-person-row" key={idx}>
                      <div className="service-person-field">
                        <label>FULL NAME</label>
                        <input
                          type="text"
                          value={person.name}
                          onChange={e => handlePersonChange(idx, "name", e.target.value)}
                          placeholder="Full Name"
                        />
                      </div>
                      <div className="service-person-field">
                        <label>EMAIL ADDRESS</label>
                        <input
                          type="email"
                          value={person.email}
                          onChange={e => handlePersonChange(idx, "email", e.target.value)}
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
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Summary Card */}
          <aside className="service-booking-sidebar">
            <div className="booking-summary-card">
              <h3 className="summary-title">Booking Summary</h3>
              
              <div className="summary-row">
                <span className="summary-label">Service</span>
                <span className="summary-value">{service.serviceName || service.name}</span>
              </div>
              
              <div className="summary-row">
                <span className="summary-label">Price</span>
                <span className="summary-value">{servicePrice.toFixed(2)} EUR{isPerPerson ? " / person" : ""}</span>
              </div>

              {isPerPerson && (
                <div className="summary-row">
                  <span className="summary-label">Number of People</span>
                  <span className="summary-value">{String(selectedPersonCount).padStart(2, "0")}</span>
                </div>
              )}

              {selectedStay && (
                <>
                  <div className="summary-row">
                    <span className="summary-label">Stay</span>
                    <span className="summary-value" style={{ fontSize: '13px' }}>
                      {selectedStay.RoomReservations?.[0]?.Room?.RoomName || 'Selected'}
                    </span>
                  </div>
                </>
              )}

              <div className="summary-divider"></div>

              <div className="summary-row summary-total">
                <span className="summary-label">Total</span>
                <span className="summary-value">{serviceTotal.toFixed(2)} EUR</span>
              </div>

              <button
                className="summary-btn"
                onClick={handleConfirm}
                disabled={confirming || !selectedStay || (isPerPerson && personDetails.length < 1)}
              >
                {confirming ? 'Adding Service...' : 'ADD TO RESERVATION'}
              </button>

              <p className="summary-note">
                Payment will be collected at checkout or at the hotel upon arrival.
              </p>

              {successMessage && <div className="summary-success">{successMessage}</div>}
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
