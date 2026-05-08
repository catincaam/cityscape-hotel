import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../Dashboard/Navbar";
import { API_BASE_URL } from "../../config/runtimeUrls";
import "./BookingSuccess.css";

const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function BookingSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [roomImages, setRoomImages] = useState([]);
  const [roomTheme, setRoomTheme] = useState(null);
  const [serviceCatalog, setServiceCatalog] = useState([]);

  const selectedServices = useMemo(() => bookingDetails?.services || {}, [bookingDetails?.services]);

  useEffect(() => {
    if (location.state?.bookingData) {
      setBookingDetails(location.state.bookingData);
    } else {
      navigate("/dashboard");
    }
  }, [location.state, navigate]);

  // Fetch showcase image based on room theme
  useEffect(() => {
    async function fetchRoomTheme() {
      try {
        // Try to get the room ID from bookingData.room
        const roomId = bookingDetails?.room?.id || bookingDetails?.room?.roomId;
        
        if (roomId) {
          console.log("🔍 Fetching room theme with ID:", roomId);
          const res = await fetch(`${API_BASE_URL}/api/room-themes/${roomId}`);
          const data = await res.json();
          setRoomTheme(data);
          const showcaseImage = resolveAssetUrl(data.showcaseImage);
          const galleryImages = (data.images || [])
            .filter(Boolean)
            .map((img) => resolveAssetUrl(img.imageUrl || img))
            .filter((img) => img !== showcaseImage);
          setRoomImages(galleryImages);
        }
      } catch (err) {
        console.error("Error fetching room theme:", err);
      }
    }
    
    if (bookingDetails?.room) {
      fetchRoomTheme();
    }
  }, [bookingDetails?.room]);

  useEffect(() => {
    async function fetchServices() {
      if (!selectedServices || Object.keys(selectedServices).length === 0) {
        setServiceCatalog([]);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/services`);
        if (!res.ok) throw new Error("Could not load services");
        const data = await res.json();
        setServiceCatalog(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching services:", err);
        setServiceCatalog([]);
      }
    }

    fetchServices();
  }, [selectedServices]);

  const serviceLookup = useMemo(() => {
    return new Map(
      serviceCatalog.map((service) => [
        String(service.ServiceId ?? service.serviceId ?? service.id),
        service
      ])
    );
  }, [serviceCatalog]);

  const selectedServiceRows = useMemo(() => {
    return Object.entries(selectedServices)
      .map(([serviceId, quantity]) => {
        const service = serviceLookup.get(String(serviceId));
        const numericQuantity = Number(quantity) || 0;
        const unitPrice = Number(service?.price || 0);

        if (!service && !numericQuantity) return null;

        return {
          id: serviceId,
          name: service?.name || `Service #${serviceId}`,
          quantity: numericQuantity,
          priceType: service?.priceType || "per_service",
          total: unitPrice * numericQuantity
        };
      })
      .filter(Boolean);
  }, [selectedServices, serviceLookup]);

  if (!bookingDetails) {
    return <div className="loading">Loading...</div>;
  }

  const { reservation, invoice, payment, room } = bookingDetails;
  const checkInDate = new Date(reservation?.requestedCheckin);
  const checkOutDate = new Date(reservation?.requestedCheckout);
  const nights = bookingDetails?.costBreakdown?.nights || Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const roomCost = bookingDetails?.costBreakdown?.roomTotal || 0;
  const servicesCost = bookingDetails?.costBreakdown?.servicesTotal || 0;
  const totalBeforeTax = roomCost + servicesCost;
  const taxFees = (invoice?.totalAmount || 0) - totalBeforeTax;
  const reservationId = reservation?.ReservationId
    || reservation?.id
    || bookingDetails?.ReservationId
    || bookingDetails?.id;
  const emailWasSent = bookingDetails?.email?.sent;

  // Download invoice PDF
  const handleDownloadInvoice = async () => {
    try {
      console.log("📋 Full bookingDetails:", bookingDetails);
      console.log("📋 Reservation object:", bookingDetails?.reservation);
      console.log("🔍 Extracted Reservation ID:", reservationId);
      
      if (!reservationId) {
        throw new Error("Reservation ID not found in booking details");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/invoices/${reservationId}/download-pdf`,
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Download failed:", response.status, errorText);
        throw new Error(`Failed to download invoice: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${reservationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log("✅ Invoice downloaded successfully");
    } catch (err) {
      console.error("Error downloading invoice:", err);
      alert("Failed to download invoice. Please try again.");
    }
  };

  return (
    <div className="success-page">
      <Navbar />

      <div className="success-container">
        {/* MAIN HEADING */}
        <div className="confirmation-heading">
          <h1>Your stay is confirmed</h1>
          <p>
            Your reservation is saved and ready in your dashboard.
            {emailWasSent ? " A confirmation email has also been sent to your inbox." : ""}
          </p>
        </div>

        {/* MAIN LAYOUT */}
        <div className="confirmation-main">
          {/* LEFT COLUMN - ROOM IMAGE */}
          <div className="confirmation-left">
            <div className="room-image-section">
              {room?.image || bookingDetails?.room?.image ? (
                <img src={room?.image || bookingDetails?.room?.image} alt="Room" className="room-image" />
              ) : bookingDetails?.room?.RoomImage ? (
                <img src={bookingDetails.room.RoomImage} alt="Room" className="room-image" />
              ) : (
                <div className="room-image-placeholder">Room Image</div>
              )}
            </div>
          </div>

          {/* CENTER COLUMN - BOOKING INFO */}
          <div className="confirmation-center">
            <div className="room-info-box">
              <span className="booking-code-label">Your booking details</span>
              <h2 className="room-name">{room?.name || bookingDetails?.room?.name || "Luxury Suite"}</h2>
              
              <div className="dates-section">
                <div className="date-item">
                  <p className="date-label">{new Date(bookingDetails?.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="date-sublabel">Check-in</p>
                </div>
                <div className="date-item">
                  <p className="date-label">{new Date(bookingDetails?.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p className="date-sublabel">Check-out</p>
                </div>
              </div>

              <div className="guests-section">
                <span className="info-badge">{bookingDetails?.adults || 1} Adults</span>
                {bookingDetails?.children > 0 && (
                  <span className="info-badge">{bookingDetails?.children} Children</span>
                )}
                <span className="info-badge">{nights} Nights</span>
              </div>
            </div>

            {/* INCLUDED EXPERIENCES */}
            {selectedServiceRows.length > 0 && (
              <div className="included-box">
                <h3>Included Experiences</h3>
                <div className="experiences-grid">
                  {selectedServiceRows.map((service) => (
                    <div key={service.id} className="experience-item">
                      <span className="experience-icon" aria-hidden="true">&#10003;</span>
                      <span className="experience-copy">
                        <span className="experience-name">{service.name}</span>
                        <span className="experience-meta">
                          {service.quantity}{" "}
                          {service.priceType === "per_person"
                            ? service.quantity === 1 ? "person" : "people"
                            : service.quantity === 1 ? "item" : "items"}
                          {service.total > 0 ? ` - ${service.total.toFixed(2)} EUR due at hotel` : ""}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - PAYMENT SUMMARY */}
          <div className="confirmation-right">
            <div className="payment-summary-box">
              <h3>Payment Summary</h3>
              <div className="payment-details">
                {roomCost > 0 && (
                  <div className="payment-line">
                    <span>{room?.name || bookingDetails?.room?.name || "Room"} ({nights} {nights === 1 ? 'night' : 'nights'})</span>
                    <span className="amount">€{roomCost.toFixed(2)}</span>
                  </div>
                )}
                {servicesCost > 0 && (
                  <div className="payment-line">
                    <span>Services due at hotel</span>
                    <span className="amount">€{servicesCost.toFixed(2)}</span>
                  </div>
                )}
                {taxFees > 0 && (
                  <div className="payment-line">
                    <span>Taxes & Fees</span>
                    <span className="amount">€{taxFees.toFixed(2)}</span>
                  </div>
                )}
                <div className="payment-line total">
                  <span>Total Amount</span>
                  <span className="amount">€{Number(invoice?.totalAmount).toFixed(2)}</span>
                </div>
                <div className="payment-line paid">
                  <span>Paid</span>
                  <span className="amount paid-amount">€{Number(payment?.amount).toFixed(2)}</span>
                </div>
              </div>
              <button
                className="btn-view-details"
                onClick={() => reservationId && navigate(`/reservation/${reservationId}`)}
              >
                VIEW RESERVATION DETAILS
              </button>
              <button 
                className="btn-download"
                onClick={handleDownloadInvoice}
              >
                DOWNLOAD INVOICE
              </button>
            </div>
          </div>
        </div>

        {/* WHAT'S NEXT */}
        <div className="whats-next-section">
          <h3>What's next?</h3>
          <div className="next-steps-grid">
            <div className="next-step">
              <div className="step-number">01</div>
              <p>Open your reservation details whenever you want to review dates, payment status, or included services.</p>
            </div>
            <div className="next-step">
              <div className="step-number">02</div>
              <p>You can download your invoice now or later from the reservation page.</p>
            </div>
            <div className="next-step">
              <div className="step-number">03</div>
              <p>If your plans change, check the cancellation option from your reservation details.</p>
            </div>
          </div>
        </div>

        {/* ROOM GALLERY */}
        {roomImages.length > 0 && (
          <div className="room-gallery-section">
            <div className="room-gallery-header">
              <h3>Your Room</h3>
              <span>{roomTheme?.name || bookingDetails?.room?.name || "Selected room"}</span>
            </div>
            <div className={`room-gallery-grid count-${Math.min(roomImages.length, 3)}`}>
              {roomImages.slice(0, 3).map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={image}
                  alt={`${roomTheme?.name || "Room"} ${index + 1}`}
                  className="room-gallery-image"
                />
              ))}
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="success-actions">
          <button 
            className="btn-back"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
