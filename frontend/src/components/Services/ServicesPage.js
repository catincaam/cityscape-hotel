import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "./ServicesPage.css";

export default function ServicesPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Toate");
  const [hasReservation, setHasReservation] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

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

  const categories = ["Toate", ...new Set(services.map(s => s.category))];

  const filteredServices =
    activeCategory === "Toate"
      ? services
      : services.filter(s => s.category === activeCategory);

  async function handleFindBooking() {
    if (!bookingRef.trim()) {
      alert("Introdu codul de rezervare");
      return;
    }

    // TODO: Verifică rezervarea în backend
    // Deocamdată simulăm
    setHasReservation(true);
  }

  return (
    <>
      <Navbar />
      <main className="services-page">
        {/* HERO */}
        <section className="services-hero">
          <h1>Îmbunătățește-ți Experiența</h1>
          <p>
            Personalizează-ți sejurul cu serviciile noastre premium. Fie că stai
            cu noi sau doar ne vizitezi pentru o zi.
          </p>
        </section>

        {/* CONTEXT CARDS */}
        <div className="context-cards">
          <div className="context-card light">
            <h2>Ai o Rezervare Activă?</h2>
            <p>Adaugă servicii direct la factura camerei tale.</p>

            {!hasReservation ? (
              <div className="booking-search">
                <input
                  type="text"
                  placeholder="ex. BK-2025-001"
                  value={bookingRef}
                  onChange={e => setBookingRef(e.target.value)}
                />
                <button onClick={handleFindBooking}>Găsește Rezervarea</button>
              </div>
            ) : (
              <div className="booking-found">
                ✓ Rezervare găsită: {bookingRef}
                <br />
                Serviciile vor fi adăugate la factura camerei tale.
              </div>
            )}
          </div>

          <div className="context-card dark">
            <h2>Doar Vizitezi pentru Ziua de Azi?</h2>
            <p>
              Bucură-te de spa, dining și activități fără o rezervare de cameră.
            </p>
            <button 
              className="secondary-btn"
              onClick={() => navigate('/day-passes')}
            >
              Explorează Day Passes
            </button>
          </div>
        </div>

        {/* SERVICES SECTION */}
        <div className="services-content">
          {/* TABS */}
          <div className="service-tabs">
            {categories.map(cat => (
              <button
                key={cat}
                className={activeCategory === cat ? "active" : ""}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* GRID */}
          <div className="services-grid">
            {filteredServices.map(service => (
              <div key={service.ServiceId} className="service-card">
                {service.image && (
                  <img
                    src={`http://localhost:9001${service.image}`}
                    alt={service.name}
                    className="service-image"
                  />
                )}

                <div className="service-body">
                  <span className="service-category">{service.category}</span>
                  <h3>{service.name}</h3>
                  <p className="service-desc">{service.description}</p>

                  <div className="service-footer">
                    <div className="price-tag">
                      <strong>{service.price}</strong>
                      <span>EUR / persoană</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>


        </div>
      </main>
    </>
  );
}
