import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "./Services.css";

export default function Services() {
  const [services, setServices] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Helper: culoare badge categorie
  function getCategoryColor(category) {
    switch (category) {
      case "Wellness & Spa": return "wellness";
      case "Transport": return "transport";
      case "Restaurant": return "restaurant";
      case "Experiențe": return "experienta";
      default: return "other";
    }
  }

  // Helper: etichetă categorie
  function getCategoryLabel(category) {
    switch (category) {
      case "Wellness & Spa": return "Wellness & Spa";
      case "Transport": return "Transport";
      case "Restaurant": return "Restaurant";
      case "Experiențe": return "Experiențe";
      default: return category || "Alt serviciu";
    }
  }



  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:9001/api/services")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setServices(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch(err => {
        console.error("Error loading services:", err);
        setError("Nu s-au putut încărca serviciile. Încearcă din nou mai târziu.");
        setServices([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredServices = activeFilter === "all" 
    ? services 
    : services.filter(s => s.category === activeFilter);

  return (
    <>
      <Navbar />
      <main className="services-page">
        {/* Header Section */}
        <div className="services-header">
          <div className="services-header-content">
            <h1>Servicii Premium</h1>
            <p>Descoperă ofertele noastre exclusive de servicii pentru o ședere de neuitat</p>
          </div>
        </div>

        <div className="services-container">
          {/* LEFT SIDE - Services */}
          <div className="services-left">
            {/* Error Message */}
            {error && (
              <div style={{
                background: '#FEE2E2',
                color: '#991B1B',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #FECACA'
              }}>
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                color: '#64748B'
              }}>
                <div>Se încarcă serviciile...</div>
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="service-filters">
              <button
                className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                Toate
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Wellness & Spa' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Wellness & Spa')}
              >
                Wellness & Spa
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Transport' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Transport')}
              >
                Transport
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Restaurant' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Restaurant')}
              >
                Restaurant
              </button>
              <button
                className={`filter-btn ${activeFilter === 'Experiențe' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Experiențe')}
              >
                Experiențe
              </button>
            </div>
                {/* Empty State */}
                {filteredServices.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    color: '#94A3B8'
                  }}>
                    <p style={{fontSize: '1rem', marginBottom: '0.5rem'}}>Nu sunt servicii disponibile</p>
                    <p style={{fontSize: '0.875rem'}}>Încearcă o altă categorie</p>
                  </div>
                ) : (
                  <div className="services-grid">
                    {filteredServices.map(service => {
                      const image = service.image
                        ? (service.image.startsWith('/uploads')
                            ? `http://localhost:9001${service.image}`
                            : service.image)
                        : null;
                      return (
                        <div key={service.ServiceId} className="service-card">
                          {/* Image Section */}
                          <div className="service-image-container">
                            {image ? (
                              <img 
                                src={image} 
                                alt={service.serviceName || service.name}
                                className="service-image-img"
                              />
                            ) : (
                              <div className="service-image-placeholder">
                                <div style={{fontSize: '2rem'}}>📋</div>
                              </div>
                            )}
                            <span className={`category-badge ${getCategoryColor(service.category)}`}>
                              {getCategoryLabel(service.category)}
                            </span>
                          </div>

                          {/* Content Section */}
                          <div className="service-content">
                            <h3 className="service-title">{service.serviceName || service.name}</h3>
                            <p className="service-description">{service.description}</p>
                            
                            {/* Price */}
                            <div className="service-price">
                              <span className="price-amount">{service.price}</span>
                              <span className="price-currency">EUR</span>
                            </div>

                            {/* Action Button */}
                            <button className="service-action-btn">
                              Adauga la cos
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </main>
    </>
  );
}

