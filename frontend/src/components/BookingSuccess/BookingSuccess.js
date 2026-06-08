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

const normalizeSelectedServices = (rawServices) => {
  if (!rawServices) return [];

  if (Array.isArray(rawServices)) {
    return rawServices
      .map((item) => {
        if (item && typeof item === "object") {
          const embedded = item.Service || item.service || item;
          const id = item.ServiceId ?? item.serviceId ?? item.id ?? embedded.ServiceId ?? embedded.serviceId ?? embedded.id;
          return {
            id: String(id),
            quantity: Number(item.quantity ?? item.qty ?? item.count ?? 1) || 1,
            embedded
          };
        }

        return {
          id: String(item),
          quantity: 1,
          embedded: null
        };
      })
      .filter((entry) => entry.id && entry.id !== "undefined" && entry.id !== "null");
  }

  return Object.entries(rawServices)
    .map(([id, value]) => {
      if (value && typeof value === "object") {
        const embedded = value.Service || value.service || value;
        const serviceId = value.ServiceId ?? value.serviceId ?? value.id ?? embedded.ServiceId ?? embedded.serviceId ?? embedded.id ?? id;
        return {
          id: String(serviceId),
          quantity: Number(value.quantity ?? value.qty ?? value.count ?? 1) || 1,
          embedded
        };
      }

      const quantity = Number(value);
      return {
        id: String(id),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        embedded: null
      };
    })
    .filter((entry) => entry.id && entry.id !== "undefined" && entry.id !== "null");
};

export default function BookingSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [roomImages, setRoomImages] = useState([]);
  const [roomTheme, setRoomTheme] = useState(null);
  const [serviceCatalog, setServiceCatalog] = useState([]);

  const selectedServices = useMemo(() => {
    if (Array.isArray(bookingDetails?.serviceDetails) && bookingDetails.serviceDetails.length > 0) {
      return bookingDetails.serviceDetails;
    }

    return bookingDetails?.services || {};
  }, [bookingDetails?.serviceDetails, bookingDetails?.services]);

  const normalizedSelectedServices = useMemo(
    () => normalizeSelectedServices(selectedServices),
    [selectedServices]
  );

  useEffect(() => {
    if (location.state?.bookingData) {
      setBookingDetails(location.state.bookingData);
    } else {
      navigate("/dashboard");
    }
  }, [location.state, navigate]);

  useEffect(() => {
    async function fetchRoomTheme() {
      try {
        const roomId = bookingDetails?.room?.id || bookingDetails?.room?.roomId;
        
        if (roomId) {
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
      if (normalizedSelectedServices.length === 0) {
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
  }, [normalizedSelectedServices]);

  const serviceLookup = useMemo(() => {
    return new Map(
      serviceCatalog.map((service) => [
        String(service.ServiceId ?? service.serviceId ?? service.id),
        service
      ])
    );
  }, [serviceCatalog]);

  const selectedServiceRows = useMemo(() => {
    return normalizedSelectedServices
      .map(({ id, quantity, embedded }) => {
        const service = serviceLookup.get(String(id)) || embedded || {};
        const unitPrice = Number(service.price ?? service.unitPrice ?? 0);
        const serviceName = service.name || service.title || service.serviceName;
        const priceType = service.priceType || service.price_type || "per_service";

        if (!serviceName && !quantity) return null;

        return {
          id,
          name: serviceName || "Booked experience",
          description: service.description || "",
          category: service.category || "Experience",
          image: resolveAssetUrl(service.image || service.imageUrl || service.image_url || ""),
          quantity,
          priceType,
          total: Number(service.total ?? unitPrice * quantity)
        };
      })
      .filter(Boolean);
  }, [normalizedSelectedServices, serviceLookup]);

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

  const handleDownloadInvoice = async () => {
    try {
      
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
        console.error("Download failed:", response.status, errorText);
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
                <div className="included-header">
                  <div>
                    <span className="included-eyebrow">Added to your stay</span>
                    <h3>Reserved Services</h3>
                  </div>
                  <span className="included-count">
                    {selectedServiceRows.length} {selectedServiceRows.length === 1 ? "service" : "services"}
                  </span>
                </div>
                <div className="experiences-grid">
                  {selectedServiceRows.map((service) => (
                    <article
                      key={service.id}
                      className={`experience-item ${service.image ? "with-image" : ""}`}
                    >
                      {service.image && (
                        <img
                          src={service.image}
                          alt={service.name}
                          className="experience-image"
                        />
                      )}
                      <div className="experience-copy">
                        <div className="experience-topline">
                          <span>{service.category}</span>
                          <span>{service.priceType === "per_person" ? "Per person" : "Per stay"}</span>
                        </div>
                        <span className="experience-name">{service.name}</span>
                        {service.description && (
                          <span className="experience-description">{service.description}</span>
                        )}
                        <div className="experience-footer">
                          <span className="experience-meta">
                            {service.quantity}{" "}
                            {service.priceType === "per_person"
                              ? service.quantity === 1 ? "person" : "people"
                              : service.quantity === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </div>
                      {service.total > 0 && (
                        <span className="experience-total">
                          {service.total.toFixed(2)} EUR
                          <small>Pay at hotel</small>
                        </span>
                      )}
                    </article>
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
                    <span className="amount">â‚¬{roomCost.toFixed(2)}</span>
                  </div>
                )}
                {servicesCost > 0 && (
                  <div className="payment-line">
                    <span>Services due at hotel</span>
                    <span className="amount">â‚¬{servicesCost.toFixed(2)}</span>
                  </div>
                )}
                {selectedServiceRows.length > 0 && (
                  <div className="payment-services">
                    {selectedServiceRows.map((service) => (
                      <div key={`summary-${service.id}`} className="payment-service-line">
                        <div className="payment-service-main">
                          {service.image && (
                            <img
                              src={service.image}
                              alt={service.name}
                              className="payment-service-image"
                            />
                          )}
                          <span>
                            {service.name}
                            <small>
                              {service.quantity}{" "}
                              {service.priceType === "per_person"
                                ? service.quantity === 1 ? "person" : "people"
                                : service.quantity === 1 ? "item" : "items"}
                            </small>
                          </span>
                        </div>
                        {service.total > 0 && <strong>{service.total.toFixed(2)} EUR</strong>}
                      </div>
                    ))}
                  </div>
                )}
                {taxFees > 0 && (
                  <div className="payment-line">
                    <span>Taxes & Fees</span>
                    <span className="amount">â‚¬{taxFees.toFixed(2)}</span>
                  </div>
                )}
                <div className="payment-line total">
                  <span>Total Amount</span>
                  <span className="amount">â‚¬{Number(invoice?.totalAmount).toFixed(2)}</span>
                </div>
                <div className="payment-line paid">
                  <span>Paid</span>
                  <span className="amount paid-amount">â‚¬{Number(payment?.amount).toFixed(2)}</span>
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
