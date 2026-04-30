import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StepRooms.css";

export default function StepRooms({ bookingData, onSelectRoom, onBack, onNext }) {
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

  const [availableAmenities, setAvailableAmenities] = useState([]);
  const [availableContinents, setAvailableContinents] = useState([]);

  useEffect(() => {
    async function fetchRooms() {
      try {
        // Calculez total oaspeți

        // Apelez /available/search cu date și numărul de oaspeți
        const url = new URL("http://localhost:9001/api/rooms/available/search");
        url.searchParams.append("checkIn", bookingData.checkIn);
        url.searchParams.append("checkOut", bookingData.checkOut);
        url.searchParams.append("adults", bookingData.adults);
        url.searchParams.append("children", bookingData.children);

        const res = await fetch(url.toString());
        const data = await res.json();

        const mapped = data.map((r) => {
          const primaryImage = r.RoomTheme?.images?.find((img) => img.isPrimary) || r.RoomTheme?.images?.[0];
          const imageUrl = r.RoomTheme?.showcaseImage || r.RoomTheme?.image || primaryImage?.imageUrl;

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
            continent: r.RoomTheme?.continent || '',
            theme: r.RoomTheme?.theme || '',
            maxGuests: r.RoomTheme?.maxGuests || 2,
            availableCount: r.availableCount || 1
          };
        });

        setRooms(mapped);

        // Extract unique amenities from all rooms
        const allAmenities = new Set();
        mapped.forEach(room => {
          if (room.amenities && Array.isArray(room.amenities)) {
            room.amenities.forEach(a => allAmenities.add(a));
          }
        });
        setAvailableAmenities(Array.from(allAmenities).sort());

        // Extract unique continents from all rooms
        const allContinents = new Set();
        mapped.forEach(room => {
          if (room.continent) {
            allContinents.add(room.continent);
          }
        });
        setAvailableContinents(Array.from(allContinents).sort());
      } catch (e) {
        console.error("Error fetching available rooms:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, [bookingData]);

  const filteredRooms = rooms.filter((r) => {
    // Filtrare după amenities
    if (
      filters.amenities.length &&
      !filters.amenities.every((a) => r.amenities.includes(a))
    )
      return false;
    
    // Filtrare după tematică (continent - same as Presentation)
    if (filters.theme !== "All") {
      if (r.continent !== filters.theme)
        return false;
    }

    const price = Number(r.basePrice || 0);
    if (price < filters.minPrice || price > filters.maxPrice) {
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
          {availableAmenities.length > 0 && (
            <div className="filter-section">
              <label className="filter-label">Features</label>
              <div className="amenities-pills">
                {availableAmenities.map((a) => (
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
          )}

          {/* ================= THEME SEGMENTED ================= */}
          <div className="filter-section">
            <label className="filter-label">Continent</label>
            <div className="theme-segmented">
              {["All", ...availableContinents].map((c) => (
                <button
                  key={c}
                  className={`theme-option ${filters.theme === c ? 'active' : ''}`}
                  onClick={() => selectTheme(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ================= LISTA CAMERE ================= */}
      <section className="rooms-list">
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
                <div className="selected-badge">✓ Selected</div>
              )}
              
              <div className="room-image">
                <img src={room.image} alt={room.name} />
              </div>

              <div className="room-card-details">
                <div className="room-header">
                  <div>
                    <h3 className="room-title">{room.name}</h3>
                    <div className="room-badges">
                      <span className="available-badge">
                        {room.availableCount} available
                      </span>
                    </div>
                  </div>
                  <div className="room-price">
                    <span className="price-amount">€{room.basePrice}</span>
                    <span className="price-label">/night</span>
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
                <strong>€{bookingData.room.basePrice}</strong>
              </div>

              <div className="summary-divider" />

              <div className="summary-total">
                <span>Total</span>
                <strong className="total-price">€{totalPrice}</strong>
              </div>
            </>
          )}
        </div>

        {bookingData.room && (
          <div className="summary-actions">
            <button className="summary-btn summary-back" onClick={onBack}>Back</button>
            <button className="summary-btn summary-continue" onClick={onNext}>Continue</button>
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}
