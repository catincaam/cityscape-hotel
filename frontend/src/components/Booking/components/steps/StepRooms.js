import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StepRooms.css";

export default function StepRooms({ bookingData, onSelectRoom, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    amenities: [],
    theme: "Toate"
  });

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch("http://localhost:9001/api/room-themes");
        const data = await res.json();

        const mapped = data.map((r) => ({
          id: r.RoomThemeId,
          name: r.name,
          description: r.description,
          image: r.images && r.images.length > 0 ? `http://localhost:9001${r.images[0]}` : `http://localhost:9001${r.image}`,
          images: r.images ? r.images.map(img => `http://localhost:9001${img}`) : [r.image ? `http://localhost:9001${r.image}` : null].filter(Boolean),
          amenities: r.amenities ? JSON.parse(r.amenities) : [],
          basePrice: r.basePrice,
          city: r.city,
          theme: r.theme,
          availableCount: r.availableCount || 0,
          floors: r.floors || []
        }));

        setRooms(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, []);

  // Mapare orașe -> continente
  const cityToContinent = {
    "Paris": "Europa",
    "Rome": "Europa",
    "London": "Europa",
    "Barcelona": "Europa",
    "Berlin": "Europa",
    "Amsterdam": "Europa",
    "Prague": "Europa",
    "Vienna": "Europa",
    "Budapest": "Europa",
    "Athens": "Europa",
    "Tokyo": "Asia",
    "Bangkok": "Asia",
    "Dubai": "Asia",
    "Singapore": "Asia",
    "Seoul": "Asia",
    "Bali": "Asia",
    "Hong Kong": "Asia",
    "Mumbai": "Asia",
    "New York": "America",
    "Los Angeles": "America",
    "Miami": "America",
    "Las Vegas": "America",
    "San Francisco": "America",
    "Chicago": "America",
    "Toronto": "America",
    "Mexico City": "America",
    "Rio de Janeiro": "America",
    "Buenos Aires": "America"
  };

  const filteredRooms = rooms.filter((r) => {
    // Filtrare după amenities
    if (
      filters.amenities.length &&
      !filters.amenities.every((a) => r.amenities.includes(a))
    )
      return false;
    
    // Filtrare după tematică (continent)
    if (filters.theme !== "Toate") {
      const continent = cityToContinent[r.city] || "Necunoscut";
      if (continent !== filters.theme)
        return false;
    }
    
    return true;
  });

  function toggleAmenity(a) {
    setFilters((f) => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter((x) => x !== a)
        : [...f.amenities, a]
    }));
  }

  function selectTheme(theme) {
    setFilters((f) => ({
      ...f,
      theme
    }));
  }

  // Calcul număr nopți
  function calculateNights() {
    if (!bookingData.checkIn || !bookingData.checkOut) return 0;
    const start = new Date(bookingData.checkIn);
    const end = new Date(bookingData.checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const nights = calculateNights();
  const totalPrice = bookingData.room ? (bookingData.room.basePrice * nights).toFixed(2) : 0;

  return (
    <div className="booking-page">
      <div className="rooms-layout">
      {/* ================= FILTRE ================= */}
      <aside className="filters">
        <div className="filters-card">
          <div className="filters-header">
            <h3>🔍 Filtre</h3>
            <button className="reset-btn" onClick={() => setFilters({ amenities: [], theme: "Toate" })}>
              Resetează
            </button>
          </div>

          {/* ================= BUGET ================= */}
          <div className="filter-section">
            <label className="filter-title">Buget <span>(pe noapte)</span></label>

            <div className="budget-inputs">
              <input type="number" placeholder="RON Min" />
              <span>—</span>
              <input type="number" placeholder="RON Max" />
            </div>
          </div>

          {/* ================= FACILITĂȚI ================= */}
          <div className="filter-section">
            <label className="filter-title">Facilități Premium</label>

            <div className="amenities-filter">
              {[
                "Mic dejun inclus",
                "Vedere panoramică",
                "Jacuzzi privat",
                "Balcon / Terasă"
              ].map((a) => (
                <label key={a} className="amenity-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.amenities.includes(a)}
                    onChange={() => toggleAmenity(a)}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          {/* ================= TEMATICĂ ================= */}
          <div className="filter-section">
            <label className="filter-title">Tematică</label>

            <div className="theme-filter">
              {["Toate", "Asia", "Europa", "America"].map((t) => (
                <label key={t} className="amenity-checkbox">
                  <input 
                    type="radio" 
                    name="theme"
                    checked={filters.theme === t}
                    onChange={() => selectTheme(t)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <button className="apply-filters-btn">✔ Aplică Filtre</button>
        </div>
      </aside>

      {/* ================= LISTA CAMERE ================= */}
      <section className="rooms-list">
        <h2>Alege Camera Perfectă</h2>
        <p className="subtitle">
          {bookingData.checkIn} – {bookingData.checkOut} ·{" "}
          {bookingData.adults} adulți
        </p>

        {loading && <p>Se încarcă camerele...</p>}

        {!loading &&
          filteredRooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-image">
                <img src={room.image} alt={room.name} />
              </div>

              <div className="room-details">
                <div className="room-header">
                  <h3 className="room-title">{room.name}</h3>
                  <div className="room-price">
                    <span className="price-amount">{room.basePrice}</span>
                    <span className="price-label">RON/noapte</span>
                  </div>
                </div>

                <div className="room-meta">
                  <span className="room-continent">📍 {room.theme}</span>
                  <span className="room-floors">
                    Etaj: {room.floors.length > 0 ? room.floors.join(", ") : "—"}
                  </span>
                </div>

                <p className="room-description">{room.description}</p>

                <div className="room-amenities">
                  {room.amenities.slice(0, 6).map((a) => (
                    <span key={a} className="amenity-tag">
                      {a}
                    </span>
                  ))}
                </div>

                <div className="room-actions">
                  <button
                    className="select-room-btn"
                    onClick={() => onSelectRoom(room)}
                  >
                    Selectează
                  </button>
                  <button 
                    className="details-link"
                    onClick={() => navigate(`/room/${room.id}`)}
                  >
                    Vezi detalii
                  </button>
                </div>
              </div>
            </div>
          ))}
      </section>

      {/* ================= SUMAR ================= */}
      <aside className="rooms-summary">
        <div className="summary-header">Sumar Rezervare</div>

        <div className="summary-body">
          <div className="summary-row">
            <span>Check-in</span>
            <strong>{bookingData.checkIn || "—"}</strong>
          </div>

          <div className="summary-row">
            <span>Check-out</span>
            <strong>{bookingData.checkOut || "—"}</strong>
          </div>

          <div className="summary-row">
            <span>Oaspeți</span>
            <strong>{bookingData.adults} Adulți</strong>
          </div>

          <div className="summary-row">
            <span>Nopți</span>
            <strong>{nights} {nights === 1 ? 'noapte' : 'nopți'}</strong>
          </div>

          <div className="summary-divider" />

          <div className="summary-row">
            <span>Cameră selectată</span>
            <strong>
              {bookingData.room ? bookingData.room.name : "—"}
            </strong>
          </div>

          {bookingData.room && (
            <>
              <div className="summary-row">
                <span>Preț/noapte</span>
                <strong>{bookingData.room.basePrice} RON</strong>
              </div>

              <div className="summary-divider" />

              <div className="summary-total">
                <span>Total</span>
                <strong className="total-price">{totalPrice} RON</strong>
              </div>
            </>
          )}
        </div>
      </aside>
      </div>
    </div>
  );
}
