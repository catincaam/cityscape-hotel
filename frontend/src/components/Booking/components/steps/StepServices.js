import { useEffect, useState } from "react";
import "./StepServices.css";

export default function StepServices({
  bookingData,
  onBack,
  onNext,
  onUpdateServices
}) {
  const [services, setServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Toate");
  const [selected, setSelected] = useState({}); // { serviceId: qty }

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("http://localhost:9001/api/services");
        const data = await res.json();
        // Filtrăm doar serviciile active și rezervabile online
        const availableServices = data.filter(
          s => s.status === "activ" && s.bookableOnline
        );
        setServices(availableServices);
      } catch (err) {
        console.error("Eroare la încărcarea serviciilor:", err);
      }
    }
    loadServices();
  }, []);

  // Inițializăm serviciile selectate din bookingData dacă există
  useEffect(() => {
    if (bookingData.services) {
      setSelected(bookingData.services);
    }
  }, [bookingData.services]);

  function changeQty(service, delta) {
    setSelected(prev => {
      const current = prev[service.ServiceId] || 0;
      const next = Math.max(0, current + delta);

      const updated = { ...prev, [service.ServiceId]: next };
      if (next === 0) delete updated[service.ServiceId];

      onUpdateServices(updated);
      return updated;
    });
  }

  const filteredServices =
    activeCategory === "Toate"
      ? services
      : services.filter(s => s.category === activeCategory);

  function calcServicesTotal() {
    return Object.entries(selected).reduce((sum, [id, qty]) => {
      const srv = services.find(s => s.ServiceId === Number(id));
      return srv ? sum + qty * Number(srv.price) : sum;
    }, 0);
  }

  // Calculăm numărul total de nopți pentru cameră
  function calculateNights() {
    if (!bookingData.checkIn || !bookingData.checkOut) return 0;
    const start = new Date(bookingData.checkIn);
    const end = new Date(bookingData.checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const nights = calculateNights();
  const roomTotal = bookingData.room ? bookingData.room.basePrice * nights : 0;

  return (
    <div className="services-layout">
      {/* LEFT */}
      <div className="services-main">
        <h1>Alege Servicii Extra</h1>
        <p className="subtitle">
          Completează-ți experiența cu facilități premium.
        </p>

        {/* FILTERS */}
        <div className="service-tabs">
          {["Toate", "Restaurant", "Wellness & Spa", "Transport", "Experiențe"].map(c => (
            <button
              key={c}
              className={activeCategory === c ? "active" : ""}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* SERVICES LIST */}
        <div className="service-list">
          {filteredServices.length === 0 && (
            <p className="no-services">Nu există servicii disponibile în această categorie.</p>
          )}
          
          {filteredServices.map(s => (
            <div key={s.ServiceId} className="service-card">
              {s.image && (
              <div className="service-image-wrapper">
                <img
                  src={`http://localhost:9001${s.image}`}
                  alt={s.name}
                  className="service-image"
                />
              </div>
            )}
              
              <div className="service-info">
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <span className="price">
                  {s.price} RON{" "}
                  <small>
                    {s.category === "Transport" ? "/sens" : "/pers"}
                  </small>
                </span>
              </div>

              <div className="qty-control">
                <button onClick={() => changeQty(s, -1)}>−</button>
                <span>{selected[s.ServiceId] || 0}</span>
                <button onClick={() => changeQty(s, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SUMMARY */}
      <aside className="services-summary">
        <h3>Sumar Rezervare</h3>

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

        <div className="summary-line">
          <span>Oaspeți</span>
          <strong>{bookingData.adults} adulți</strong>
        </div>

        <div className="summary-line">
          <span>Nopți</span>
          <strong>{nights}</strong>
        </div>

        <div className="summary-divider" />

        <div className="summary-room">
          <span>Cameră</span>
          <strong>{bookingData.room?.name}</strong>
          <div className="room-calc">
            <span>{bookingData.room?.basePrice} × {nights} nopți</span>
            <strong className="price">{roomTotal.toFixed(2)} RON</strong>
          </div>
        </div>

        <div className="summary-divider" />

        <div className="summary-services">
          <span className="section-title">Servicii selectate</span>
          {Object.keys(selected).length === 0 ? (
            <p className="no-services-msg">Niciun serviciu selectat</p>
          ) : (
            Object.entries(selected).map(([id, qty]) => {
              const srv = services.find(s => s.ServiceId === Number(id));
              if (!srv) return null;
              return (
                <div key={id} className="summary-line">
                  <span>{srv.name} × {qty}</span>
                  <strong>{(qty * srv.price).toFixed(2)} RON</strong>
                </div>
              );
            })
          )}
        </div>

        <div className="summary-divider" />

        <div className="summary-total">
          <span>Total</span>
          <strong>{(roomTotal + calcServicesTotal()).toFixed(2)} RON</strong>
        </div>

        <div className="summary-actions">
          <button className="back" onClick={onBack}>Înapoi</button>
          <button className="next" onClick={onNext}>
            Continuă spre Confirmare →
          </button>
        </div>
      </aside>
    </div>
  );
}
