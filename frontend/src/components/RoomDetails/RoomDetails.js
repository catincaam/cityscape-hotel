import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Wifi, Wind, Tv, Wine, Lock, UtensilsCrossed, Coffee, Bath, Armchair, Lightbulb } from "lucide-react";
import { API_BASE_URL } from "../../config/runtimeUrls";
import Navbar from "../Dashboard/Navbar";
import "./RoomDetailsNew.css";

function resolveAssetUrl(path) {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state?.bookingData || {};

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [modalImage, setModalImage] = useState(0);

  useEffect(() => {
    async function loadRoom() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/room-themes/${id}`);
        const data = await res.json();
        setRoom(data);
      } catch (err) {
        console.error("Error loading room:", err);
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
          <p>Loading room details...</p>
        </div>
      </>
    );
  }

  if (!room) {
    return (
      <>
        <Navbar />
        <div className="error-container">
          <h2>Room not found</h2>
          <button onClick={() => navigate("/booking")}>Back to Booking</button>
        </div>
      </>
    );
  }

  const handleImageClick = (index) => {
    setModalImage(index);
    setShowGalleryModal(true);
  };

  const handleNextImage = () => {
    setModalImage((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setModalImage((prev) => (prev - 1 + images.length) % images.length);
  };

  function handleReserve() {
    if (bookingData) {
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
            ? resolveAssetUrl(room.images[0])
            : resolveAssetUrl(room.image),
          city: room.city,
          theme: room.theme
        },
        goToStep: 2
      };
      navigate("/booking", { state: stateToSend });
    } else {
      navigate("/booking");
    }
  }

  const images = room.images && room.images.length > 0 
    ? room.images.map(resolveAssetUrl)
    : room.image 
    ? [resolveAssetUrl(room.image)]
    : [];

  const amenitiesList = typeof room.amenities === 'string' 
    ? JSON.parse(room.amenities) 
    : room.amenities || [];

  // Map amenity names to lucide-react icons
  const getAmenityIcon = (amenityName) => {
    const nameLC = amenityName.toLowerCase();
    const iconProps = { size: 18, strokeWidth: 1.5, className: "text-gray-600" };

    if (nameLC.includes("wifi")) return <Wifi {...iconProps} />;
    if (nameLC.includes("air") || nameLC.includes("conditioning")) return <Wind {...iconProps} />;
    if (nameLC.includes("tv") || nameLC.includes("smart")) return <Tv {...iconProps} />;
    if (nameLC.includes("mini") || nameLC.includes("bar") || nameLC.includes("wine")) return <Wine {...iconProps} />;
    if (nameLC.includes("safe")) return <Lock {...iconProps} />;
    if (nameLC.includes("kitchen") || nameLC.includes("dining")) return <UtensilsCrossed {...iconProps} />;
    if (nameLC.includes("coffee") || nameLC.includes("tea")) return <Coffee {...iconProps} />;
    if (nameLC.includes("bath") || nameLC.includes("tub")) return <Bath {...iconProps} />;
    if (nameLC.includes("sofa") || nameLC.includes("seating")) return <Armchair {...iconProps} />;
    
    return <Lightbulb {...iconProps} />;
  };

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
              onClick={() => {
                const stateToPass = {
                  checkIn: bookingData?.checkIn || "",
                  checkOut: bookingData?.checkOut || "",
                  adults: bookingData?.adults || 2,
                  children: bookingData?.children || 0,
                  goToStep: 2
                };
                navigate("/booking", { state: stateToPass });
              }}
            >
              Back to rooms
            </button>
            <span className="badge">{room.city}</span>
            <h1>{room.name}</h1>
            <p className="theme-subtitle">{room.theme}</p>
            <div className="rating">Premium Experience</div>
          </div>

          {images.length > 1 && (
            <div className="room-gallery-strip" aria-label="Room gallery">
              {images.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  className={`gallery-tile ${selectedImage === index ? "active" : ""}`}
                  onClick={() => setSelectedImage(index)}
                  onDoubleClick={() => handleImageClick(index)}
                >
                  <img src={img} alt={`${room.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="room-content">
          {/* LEFT CONTENT */}
          <div className="room-main">
            <section className="room-section">
              <h2>Your Experience</h2>
              <p className="description">{room.description}</p>
            </section>

            <section className="room-section room-details-inline">
              <div className="details-meta">
                {room.city && <div><span>Destination</span><strong>{room.city}</strong></div>}
                {room.maxGuests && <div><span>Guests</span><strong>{room.maxGuests}</strong></div>}
                {room.bedType && <div><span>Bed</span><strong>{room.bedType}</strong></div>}
                {room.size && <div><span>Surface</span><strong>{room.size} sqm</strong></div>}
              </div>
              {room.theme && <p className="details-theme">{room.theme}</p>}
            </section>

            <section className="room-section">
              <h3>What this room offers</h3>
              <div className="amenities">
                {amenitiesList.map((a, index) => (
                  <div key={index} className="amenity-item">
                    <span className="amenity-icon">{getAmenityIcon(a)}</span>
                    <span className="amenity-text">{a}</span>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* RIGHT BOOKING BOX */}
          <aside className="booking-box">
            <div className="price-section">
              <div className="price">
                <strong>{room.basePrice} EUR</strong>
                <span>/ night</span>
              </div>
            </div>



            <button 
              className="reserve-btn"
              onClick={handleReserve}
              disabled={room.availableCount === 0}
            >
              {room.availableCount === 0 ? 'Unavailable' : 'Check availability'}
            </button>
          </aside>
        </div>

        {/* GALLERY MODAL */}
        {showGalleryModal && (
          <div className="modal-overlay" onClick={() => setShowGalleryModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowGalleryModal(false)}>X</button>
              <div className="modal-image-container">
                <img src={images[modalImage]} alt="Gallery" className="modal-image" />
              </div>
              <button className="modal-nav modal-prev" onClick={handlePrevImage}>Prev</button>
              <button className="modal-nav modal-next" onClick={handleNextImage}>Next</button>
              <div className="modal-counter">{modalImage + 1} / {images.length}</div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

