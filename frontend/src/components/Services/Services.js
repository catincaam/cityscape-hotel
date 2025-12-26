import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "./Services.css";

export default function Services() {
  const [services, setServices] = useState([]);
  const [reservation, setReservation] = useState(null);
  const [selectedServices, setSelectedServices] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Încarcă serviciile disponibile
      const servicesRes = await fetch("http://localhost:9001/api/services", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const servicesData = await servicesRes.json();
      setServices(servicesData);

      // Încarcă rezervarea activă
      const dashboardRes = await fetch("http://localhost:9001/api/dashboard", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const dashboardData = await dashboardRes.json();
      setReservation(dashboardData.nextDestination);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  }

  const addService = (serviceId, price) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: { quantity: (prev[serviceId]?.quantity || 0) + 1, price }
    }));
  };

  const removeService = (serviceId) => {
    setSelectedServices(prev => {
      const updated = { ...prev };
      delete updated[serviceId];
      return updated;
    });
  };

  const updateQuantity = (serviceId, delta, price) => {
    setSelectedServices(prev => {
      const currentQty = prev[serviceId]?.quantity || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const updated = { ...prev };
        delete updated[serviceId];
        return updated;
      }
      return {
        ...prev,
        [serviceId]: { quantity: newQty, price }
      };
    });
  };

  const getTotal = () => {
    return Object.entries(selectedServices).reduce((sum, [id, data]) => {
      return sum + (data.quantity * data.price);
    }, 0);
  };

  const getCategoryLabel = (category) => {
    const labels = {
      spa: "SPA & WELLNESS",
      dining: "DINING",
      transport: "TRANSPORT",
      experience: "EXPERIENȚE"
    };
    return labels[category] || category.toUpperCase();
  };

  const getCategoryColor = (category) => {
    const colors = {
      spa: "bg-blue-100 text-blue-600",
      dining: "bg-orange-100 text-orange-600",
      transport: "bg-purple-100 text-purple-600",
      experience: "bg-green-100 text-green-600"
    };
    return colors[category] || "bg-gray-100 text-gray-600";
  };

  const filteredServices = activeFilter === "all" 
    ? services 
    : services.filter(s => s.category === activeFilter);

  const selectedCount = Object.keys(selectedServices).length;

  return (
    <>
      <Navbar />
      <main className="services-page">
        <div className="services-container">
          {/* LEFT SIDE - Services */}
          <div className="services-left">
            {/* Reservation Info */}
            {reservation && (
              <section className="reservation-banner">
                <div className="reservation-header">
                  <span className="status-badge active">Activă</span>
                  <h2>Rezervarea Ta</h2>
                </div>
                <div className="reservation-details">
                  <div className="detail-box">
                    <p className="detail-label">ID Rezervare</p>
                    <p className="detail-value">#{reservation.reservationId}</p>
                  </div>
                  <div className="detail-box">
                    <p className="detail-label">Check-in / Out</p>
                    <p className="detail-value">
                      {new Date(reservation.checkIn).toLocaleDateString("ro-RO", { day: 'numeric', month: 'short' })} - 
                      {new Date(reservation.checkOut).toLocaleDateString("ro-RO", { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="detail-box">
                    <p className="detail-label">Cameră</p>
                    <p className="detail-value">{reservation.room}</p>
                  </div>
                  <div className="detail-box">
                    <p className="detail-label">Oaspeți</p>
                    <p className="detail-value">{reservation.guests} {reservation.guests === 1 ? 'Persoană' : 'Persoane'}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Filters */}
            <div className="service-filters">
              <button 
                className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                Toate
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'spa' ? 'active' : ''}`}
                onClick={() => setActiveFilter('spa')}
              >
                Wellness & Spa
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'dining' ? 'active' : ''}`}
                onClick={() => setActiveFilter('dining')}
              >
                Dining
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'experience' ? 'active' : ''}`}
                onClick={() => setActiveFilter('experience')}
              >
                Experiențe
              </button>
            </div>

            {/* Services Grid */}
            <div className="services-grid">
              {filteredServices.map(service => {
                const isSelected = selectedServices[service.ServiceId];
                return (
                  <div key={service.ServiceId} className={`service-card ${isSelected ? 'selected' : ''}`}>
                    <div className="service-image">
                      <span className={`category-badge ${getCategoryColor(service.category)}`}>
                        {getCategoryLabel(service.category)}
                      </span>
                    </div>
                    <div className="service-content">
                      <h3 className="service-title">{service.serviceName}</h3>
                      <p className="service-description">{service.description}</p>
                      <div className="service-price">
                        <span className="price-amount">{service.price}</span>
                        <span className="price-currency">RON</span>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="quantity-control">
                        <button onClick={() => updateQuantity(service.ServiceId, -1, service.price)}>−</button>
                        <span>{selectedServices[service.ServiceId].quantity}</span>
                        <button onClick={() => updateQuantity(service.ServiceId, 1, service.price)}>+</button>
                      </div>
                    ) : (
                      <button 
                        className="add-service-btn"
                        onClick={() => addService(service.ServiceId, service.price)}
                      >
                        + Adaugă
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE - Cart */}
          <aside className="services-cart">
            <div className="cart-header">
              <h3>Servicii Selectate</h3>
              <span className="cart-count">{selectedCount}</span>
            </div>

            <div className="cart-items">
              {selectedCount === 0 ? (
                <div className="cart-empty">
                  <p>Nu ai selectat încă niciun serviciu</p>
                </div>
              ) : (
                Object.entries(selectedServices).map(([serviceId, data]) => {
                  const service = services.find(s => s.ServiceId === parseInt(serviceId));
                  if (!service) return null;
                  return (
                    <div key={serviceId} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{service.serviceName}</h4>
                        <p className="cart-item-price">{data.quantity} x {data.price} RON</p>
                      </div>
                      <div className="cart-item-actions">
                        <div className="quantity-mini">
                          <button onClick={() => updateQuantity(parseInt(serviceId), -1, data.price)}>−</button>
                          <span>{data.quantity}</span>
                          <button onClick={() => updateQuantity(parseInt(serviceId), 1, data.price)}>+</button>
                        </div>
                        <button className="remove-btn" onClick={() => removeService(serviceId)}>×</button>
                      </div>
                      <div className="cart-item-total">{(data.quantity * data.price).toFixed(2)} RON</div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{getTotal().toFixed(2)} RON</span>
                </div>
                <div className="summary-row">
                  <span>Taxe</span>
                  <span>Inclus</span>
                </div>
                <div className="summary-total">
                  <span>Total de Plată</span>
                  <span>{getTotal().toFixed(2)} RON</span>
                </div>
              </div>

              <button 
                className="finalize-btn"
                disabled={selectedCount === 0}
                onClick={() => {
                  // TODO: Implement finalize logic
                  alert("Funcționalitatea de finalizare va fi implementată!");
                }}
              >
                Finalizează →
              </button>
              <button className="cancel-btn" onClick={() => navigate("/dashboard")}>
                Înapoi la Dashboard
              </button>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
