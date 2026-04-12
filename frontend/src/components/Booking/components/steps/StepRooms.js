import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StepRooms.css";

export default function StepRooms({ bookingData, onSelectRoom, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState(bookingData.room?.id || null);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    amenities: [],
    theme: "All",
    minPrice: 50,
    maxPrice: 300
  });

  useEffect(() => {
    async function fetchRooms() {
      try {
        // Calculez total oaspeți
        const totalGuests = bookingData.adults + bookingData.children;

        // Apelez /available/search cu date și numărul de oaspeți
        const url = new URL("http://localhost:9001/api/rooms/available/search");
        url.searchParams.append("checkIn", bookingData.checkIn);
        url.searchParams.append("checkOut", bookingData.checkOut);
        url.searchParams.append("adults", bookingData.adults);
        url.searchParams.append("children", bookingData.children);

        const res = await fetch(url.toString());
        const data = await res.json();

        const mapped = data.map((r) => {
          // Ia prima imagine (cea cu isPrimary=true sau prima din array)
          const primaryImage = r.RoomTheme?.images?.[0];
          const imageUrl = primaryImage?.imageUrl || r.RoomTheme?.image;

          return {
            id: r.RoomTheme?.RoomThemeId || r.RoomThemeId,
            roomId: r.RoomId,
            name: r.RoomTheme?.name || 'Unknown Room',
            description: r.RoomTheme?.description || '',
            image: imageUrl 
              ? `http://localhost:9001${imageUrl}` 
              : 'https://via.placeholder.com/220?text=No+Image',
            amenities: r.RoomTheme?.amenities ? (Array.isArray(r.RoomTheme.amenities) ? r.RoomTheme.amenities : JSON.parse(r.RoomTheme.amenities)) : [],
            basePrice: r.RoomTheme?.basePrice || 0,
            city: r.RoomTheme?.city || '',
            theme: r.RoomTheme?.theme || '',
            maxGuests: r.RoomTheme?.maxGuests || 2,
            availableCount: r.availableCount || 1
          };
        });

        setRooms(mapped);
      } catch (e) {
        console.error("Error fetching available rooms:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, [bookingData]);

  // Mapare orașe -> continente
  const cityToContinent = {
    "Paris": "Europe",
    "Rome": "Europe",
    "London": "Europe",
    "Barcelona": "Europe",
    "Berlin": "Europe",
    "Amsterdam": "Europe",
    "Prague": "Europe",
    "Vienna": "Europe",
    "Budapest": "Europe",
    "Athens": "Europe",
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
    if (filters.theme !== "All") {
      const continent = cityToContinent[r.city] || "Unknown";
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
      {/* ================= FILTRE PREMIUM ================= */}
      <aside className="filters">
        <div className="filters-card">
          <div className="filters-header">
            <h3 className="filters-title">Refine your stay</h3>
            <button className="reset-btn" onClick={() => setFilters({ amenities: [], theme: "All", minPrice: 50, maxPrice: 300 })}>
              Reset
            </button>
          </div>

          {/* ================= PRICE SLIDER ================= */}
          <div className="filter-section">
            <div className="price-header">
              <label className="filter-label">Price range</label>
              <span className="price-display">€{filters.minPrice} – €{filters.maxPrice}</span>
            </div>
            <div className="slider-container">
              <input
                type="range"
                min="50"
                max="300"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: Math.min(+e.target.value, filters.maxPrice) })}
                className="slider slider-min"
              />
              <input
                type="range"
                min="50"
                max="300"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: Math.max(+e.target.value, filters.minPrice) })}
                className="slider slider-max"
              />
            </div>
          </div>

          {/* ================= AMENITIES PILLS ================= */}
          <div className="filter-section">
            <label className="filter-label">Popular features</label>
            <div className="amenities-pills">
              {[
                "Breakfast included",
                "Panoramic view",
                "Private jacuzzi",
                "Balcony / Terrace"
              ].map((a) => (
                <button
                  key={a}
                  className={`amenity-pill ${filters.amenities.includes(a) ? 'active' : ''}`}
                  onClick={() => toggleAmenity(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* ================= THEME SEGMENTED ================= */}
          <div className="filter-section">
            <label className="filter-label">Theme</label>
            <div className="theme-segmented">
              {["All", "Europe", "Asia", "America"].map((t) => (
                <button
                  key={t}
                  className={`theme-option ${filters.theme === t ? 'active' : ''}`}
                  onClick={() => selectTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ================= LISTA CAMERE ================= */}
      <section className="rooms-list">
        <h2>Choose the Perfect Room</h2>
        <p className="subtitle">
          {bookingData.checkIn} – {bookingData.checkOut} · {bookingData.adults + bookingData.children} {bookingData.adults + bookingData.children === 1 ? 'guest' : 'guests'}
        </p>

        {loading && <p>Loading available rooms...</p>}

        {!loading && filteredRooms.length === 0 && (
          <div className="no-rooms-message">
            <p>No rooms available for this combination.</p>
            <p>Try different dates or a different guest configuration.</p>
          </div>
        )}

        {!loading && filteredRooms.length > 0 && (
          <p className="rooms-count">
            {filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'} available
          </p>
        )}

        {!loading &&
          filteredRooms.map((room) => (
            <div 
              key={room.id} 
              className={`room-card ${selectedRoomId === room.id ? 'selected' : ''}`}
            >
              {selectedRoomId === room.id && (
                <div className="selected-badge">Selected</div>
              )}
              
              <div className="room-image">
                <img src={room.image} alt={room.name} />
              </div>

              <div className="room-details">
                <div className="room-header">
                  <div>
                    <h3 className="room-title">{room.name}</h3>
                    <div className="room-badges">
                      {room.maxGuests === bookingData.adults + bookingData.children && (
                        <span className="recommended-badge">Perfect fit</span>
                      )}
                      <span className="available-badge">
                        {room.availableCount} {room.availableCount === 1 ? 'available' : 'available'}
                      </span>
                    </div>
                  </div>
                  <div className="room-price">
                    <span className="price-amount">{room.basePrice}</span>
                    <span className="price-label">EUR/night</span>
                  </div>
                </div>

                <div className="room-meta">
                  <span className="room-theme">{room.theme}</span>
                  <span className="room-city">{room.city}</span>
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
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      onSelectRoom(room);
                    }}
                  >
                    {selectedRoomId === room.id ? 'Selected Room' : 'Select Room'}
                  </button>
                  <button 
                    className="details-link"
                    onClick={() => navigate(`/room/${room.id}`, { state: { bookingData } })}
                  >
                    View details
                  </button>
                </div>
              </div>
            </div>
          ))}
      </section>

      {/* ================= SUMAR ================= */}
      <aside className="rooms-summary">
        <div className="summary-header">Booking Summary</div>

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
            <span>Guests</span>
            <strong>{bookingData.adults} {bookingData.adults === 1 ? 'Adult' : 'Adults'}</strong>
          </div>

          <div className="summary-row">
            <span>Nights</span>
            <strong>{nights} {nights === 1 ? 'night' : 'nights'}</strong>
          </div>

          <div className="summary-divider" />

          <div className="summary-row">
            <span>Selected room</span>
            <strong>
              {bookingData.room ? bookingData.room.name : "—"}
            </strong>
          </div>

          {bookingData.room && (
            <>
              <div className="summary-row">
                <span>Price/night</span>
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
