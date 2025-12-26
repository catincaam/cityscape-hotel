import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../Dashboard/Navbar";
import "./RoomDetailsNew.css";

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state?.bookingData;

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    async function loadRoom() {
      try {
        const res = await fetch(`http://localhost:9001/api/room-themes/${id}`);
        const data = await res.json();
        setRoom(data);
      } catch (err) {
        console.error("Eroare la încărcarea camerei:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRoom();
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-container">
          <p>Se încarcă detaliile camerei...</p>
        </div>
      </>
    );
  }

  if (!room) {
    return (
      <>
        <Navbar />
        <div className="error-container">
          <h2>Camera nu a fost găsită</h2>
          <button onClick={() => navigate("/booking")}>Înapoi la Rezervare</button>
        </div>
      </>
    );
  }

  function handleReserve() {
    console.log("🔍 bookingData in RoomDetails:", bookingData);
    
    if (bookingData) {
      // Mergem la lista de camere cu camera selectată
      const stateToSend = {
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        adults: bookingData.adults,
        children: bookingData.children,
        room: {
          id: room.RoomThemeId,
          name: room.name,
          basePrice: room.basePrice,
          image: room.images && room.images.length > 0 
            ? `http://localhost:9001${room.images[0]}` 
            : `http://localhost:9001${room.image}`,
          city: room.city,
          theme: room.theme
        },
        goToStep: 2
      };
      
      console.log("📤 Sending state:", stateToSend);
      
      navigate("/booking", { state: stateToSend });
    } else {
      // Dacă nu avem date de booking, mergem la booking de la început
      navigate("/booking");
    }
  }

  const images = room.images && room.images.length > 0 
    ? room.images.map(img => `http://localhost:9001${img}`)
    : room.image 
    ? [`http://localhost:9001${room.image}`]
    : [];

  const amenitiesList = typeof room.amenities === 'string' 
    ? JSON.parse(room.amenities) 
    : room.amenities || [];

  return (
    <>
      <Navbar />
      <main className="room-details">
        {/* HERO IMAGE */}
        <section className="room-hero">
          <img 
            src={images[selectedImage] || images[0]} 
            alt={room.name} 
            className="hero-image"
          />
          <div className="hero-overlay">
            <button 
              className="back-corner-btn"
              onClick={() => navigate("/booking", {
                state: bookingData ? { ...bookingData, goToStep: 2 } : {}
              })}
            >
              ← Înapoi
            </button>
            <span className="badge">📍 {room.city}</span>
            <h1>{room.name}</h1>
            <p className="theme-subtitle">{room.theme}</p>
          </div>

          {/* GALLERY THUMBNAILS */}
          {images.length > 1 && (
            <div className="image-gallery">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${room.name} ${index + 1}`}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="room-content">
          {/* LEFT CONTENT */}
          <div className="room-main">
            <section className="section">
              <h2>Spiritul Camerei</h2>
              <p className="description">{room.description}</p>
            </section>

            <section className="section">
              <h3>Specificații Cameră</h3>
              <div className="specs-grid">
                <Spec label="Dimensiune" value={room.size ? `${room.size} m²` : "—"} icon="📐" />
                <Spec label="Capacitate" value={room.maxGuests ? `Max ${room.maxGuests} pers` : "—"} icon="👥" />
                <Spec label="Tip Pat" value={room.bedType || "—"} icon="🛏️" />
                <Spec label="Etaje Disponibile" value={room.floors && room.floors.length > 0 ? room.floors.join(", ") : "—"} icon="🏢" />
              </div>
            </section>

            <section className="section">
              <h3>Facilități Incluse</h3>
              <ul className="amenities">
                {amenitiesList.map((a, index) => (
                  <li key={index}>
                    <span className="check-icon">✓</span>
                    {a}
                  </li>
                ))}
              </ul>
            </section>

            {room.availableCount !== undefined && (
              <section className="section availability">
                <div className="availability-badge">
                  {room.availableCount > 0 ? (
                    <>
                      <span className="available">✓ Disponibil</span>
                      <span className="count">{room.availableCount} {room.availableCount === 1 ? 'cameră disponibilă' : 'camere disponibile'}</span>
                    </>
                  ) : (
                    <span className="unavailable">Complet rezervat</span>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT BOOKING BOX */}
          <aside className="booking-box">
            <div className="price-section">
              <div className="price">
                <strong>{room.basePrice}</strong>
                <span>RON / noapte</span>
              </div>
            </div>

            {bookingData && (
              <>
                <div className="booking-divider" />
                <div className="booking-info">
                  <div className="info-row">
                    <span className="label">Check-in</span>
                    <strong>{bookingData.checkIn}</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">Check-out</span>
                    <strong>{bookingData.checkOut}</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">Oaspeți</span>
                    <strong>{bookingData.adults} {bookingData.adults === 1 ? 'adult' : 'adulți'}</strong>
                  </div>
                </div>
              </>
            )}

            <button 
              className="reserve-btn"
              onClick={handleReserve}
              disabled={room.availableCount === 0}
            >
              {room.availableCount === 0 ? 'Indisponibil' : 'Selectează această cameră'}
            </button>
          </aside>
        </div>
      </main>
    </>
  );
}

function Spec({ label, value, icon }) {
  return (
    <div className="spec">
      <span className="spec-icon">{icon}</span>
      <div className="spec-content">
        <span className="spec-label">{label}</span>
        <strong className="spec-value">{value}</strong>
      </div>
    </div>
  );
}
