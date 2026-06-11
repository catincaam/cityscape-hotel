import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../../config/runtimeUrls";
import "./StepServices.css";

const ACTIVE_SERVICE_STATUSES = ["activ", "active", "available", "disponibil"];

function resolveServiceImage(value) {
  if (!value) return "";
  return value.startsWith("http") ? value : `${API_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function isServiceAvailable(service) {
  const status = String(service.status || "activ").trim().toLowerCase();
  const bookableOnline =
    service.bookableOnline === undefined ||
    service.bookableOnline === null ||
    service.bookableOnline === true ||
    service.bookableOnline === 1 ||
    String(service.bookableOnline).toLowerCase() === "true";

  return ACTIVE_SERVICE_STATUSES.includes(status) && bookableOnline;
}

export default function StepServices({
  bookingData,
  onBack,
  onNext,
  onUpdateServices
}) {
  const [services, setServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selected, setSelected] = useState({});

  const guestsCount = (bookingData.adults || 0) + (bookingData.children || 0);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/services`);
        const data = await res.json();
        const availableServices = Array.isArray(data)
          ? data.filter(isServiceAvailable)
          : [];

        setServices(availableServices);
      } catch (err) {
        console.error("Error loading services:", err);
      }
    }
    loadServices();
  }, []);

  useEffect(() => {
    if (services.length === 0) return;

    const currentServices = bookingData.services || {};
    const availableIds = new Set(services.map(service => String(service.ServiceId)));
    const sanitizedSelected = Object.fromEntries(
      Object.entries(currentServices).filter(([id]) => availableIds.has(String(id)))
    );
    const selectionChanged =
      Object.keys(sanitizedSelected).length !== Object.keys(currentServices).length ||
      Object.entries(sanitizedSelected).some(([id, qty]) => currentServices[id] !== qty);

    if (selectionChanged) {
      setSelected(sanitizedSelected);
      onUpdateServices(sanitizedSelected);
    }
  }, [bookingData.services, onUpdateServices, services]);

  useEffect(() => {
    if (bookingData.services) {
      setSelected(bookingData.services);
    }
  }, [bookingData.services]);

  const categories = useMemo(() => {
    const serviceCategories = services
      .map(service => service.category?.trim())
      .filter(Boolean);
    return ["All", ...Array.from(new Set(serviceCategories)).sort()];
  }, [services]);

  const filteredServices = activeCategory === "All"
    ? services
    : services.filter(service => service.category === activeCategory);

  function isPerPerson(service) {
    return service.priceType === "per_person";
  }

  function getMaxQty(service) {
    return isPerPerson(service) ? Math.max(guestsCount, 1) : 1;
  }

  function changeQty(service, delta) {
    setSelected(prev => {
      const current = prev[service.ServiceId] || 0;
      const next = Math.max(0, Math.min(current + delta, getMaxQty(service)));
      const updated = { ...prev, [service.ServiceId]: next };

      if (next === 0) {
        delete updated[service.ServiceId];
      }

      onUpdateServices(updated);
      return updated;
    });
  }

  function calcServicesTotal() {
    return Object.entries(selected).reduce((sum, [id, qty]) => {
      const service = services.find(item => item.ServiceId === Number(id));
      return service ? sum + qty * Number(service.price) : sum;
    }, 0);
  }

  function calculateNights() {
    if (!bookingData.checkIn || !bookingData.checkOut) return 0;
    const start = new Date(bookingData.checkIn);
    const end = new Date(bookingData.checkOut);
    return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
  }

  const nights = calculateNights();
  const roomTotal = bookingData.room ? bookingData.room.basePrice * nights : 0;
  const servicesTotal = calcServicesTotal();

  return (
    <div className="services-layout">
      <div className="services-main">
        <div className="services-step-header">
          <h1>Add Extra Services</h1>
          <p className="subtitle">
            Reserve premium services for your stay. They are confirmed with your booking and paid at the hotel.
          </p>
        </div>

        <div className="service-tabs">
          {categories.map(category => (
            <button
              key={category}
              className={activeCategory === category ? "active" : ""}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="service-list">
          {filteredServices.length === 0 && (
            <p className="no-services">No services available in this category.</p>
          )}

          {filteredServices.map(service => {
            const currentQty = selected[service.ServiceId] || 0;
            const selectedService = currentQty > 0;
            const perPerson = isPerPerson(service);
            const maxQty = getMaxQty(service);
            const serviceTotal = currentQty * Number(service.price || 0);

            return (
              <article
                key={service.ServiceId}
                className={`service-card ${selectedService ? "active" : ""}`}
              >
                <div className="service-image-wrapper">
                  {service.image ? (
                    <img
                      src={resolveServiceImage(service.image)}
                      alt={service.name}
                      className="service-image"
                    />
                  ) : (
                    <div className="service-image-placeholder">+</div>
                  )}
                </div>

                <div className="service-info">
                  <div className="service-card-topline">
                    <span className="service-category-pill">{service.category}</span>
                    <span className="service-pay-note">Pay at hotel</span>
                  </div>

                  <div className="service-copy">
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                  </div>

                  <div className="service-footer">
                    <div className="price-badge">
                      <span className="price">{Number(service.price).toFixed(2)} EUR</span>
                      <span className="price-label">
                        {perPerson ? "per person" : "per booking"}
                      </span>
                    </div>

                    <div className="service-picker">
                      <span className="picker-label">
                        {perPerson ? "People" : "Booking"}
                        {perPerson && <small>max {maxQty}</small>}
                      </span>
                      <div className="qty-control">
                        <button onClick={() => changeQty(service, -1)} disabled={currentQty === 0}>-</button>
                        <span>{currentQty}</span>
                        <button onClick={() => changeQty(service, 1)} disabled={currentQty >= maxQty}>+</button>
                      </div>
                    </div>

                    <div className="service-line-total">
                      <span>Reserved</span>
                      <strong>{serviceTotal.toFixed(2)} EUR</strong>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="services-summary">
        <h3>Booking Summary</h3>

        <div className="summary-block">
          <div>
            <span>Check-in</span>
            <strong>{bookingData.checkIn}</strong>
          </div>
          <div>
            <span>Check-out</span>
            <strong>{bookingData.checkOut}</strong>
          </div>
        </div>

        <div className="summary-block summary-block-compact">
          <div>
            <span>Guests</span>
            <strong>{guestsCount} guest{guestsCount !== 1 ? "s" : ""}</strong>
          </div>
          <div>
            <span>Nights</span>
            <strong>{nights}</strong>
          </div>
        </div>

        <div className="summary-room">
          <span>Room</span>
          <strong>{bookingData.room?.name}</strong>
          <div className="room-calc">
            <span>{bookingData.room?.basePrice} x {nights} nights</span>
            <strong className="price">{roomTotal.toFixed(2)} EUR</strong>
          </div>
        </div>

        {Object.keys(selected).length > 0 && (
          <div className="summary-services">
            <span className="services-section-title">Selected services</span>
            {Object.entries(selected).map(([id, qty]) => {
              const service = services.find(item => item.ServiceId === Number(id));
              if (!service) return null;
              const quantityLabel = service.priceType === "per_person"
                ? `${qty} people`
                : "1 booking";

              return (
                <div key={id} className="summary-line service-summary-line">
                  <span>{service.name}<small>{quantityLabel}</small></span>
                  <strong>{(qty * service.price).toFixed(2)} EUR</strong>
                </div>
              );
            })}
          </div>
        )}

        <div className="summary-total">
          <span>Due now</span>
          <strong>{roomTotal.toFixed(2)} EUR</strong>
        </div>

        {servicesTotal > 0 && (
          <div className="hotel-payment-note">
            <span>Due at hotel</span>
            <strong>{servicesTotal.toFixed(2)} EUR</strong>
            <p>Service payment is collected during your stay.</p>
          </div>
        )}

        <div className="summary-actions">
          <button className="back" onClick={onBack}>Back</button>
          <button className="next" onClick={onNext}>Continue</button>
        </div>
      </aside>
    </div>
  );
}
