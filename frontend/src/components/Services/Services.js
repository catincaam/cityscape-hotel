import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "../Rewards/Rewards.css";

export default function Services() {
  const [services, setServices] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:9001/api/services")
      .then(res => res.json())
      .then(data => {
        setServices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const serviceCategories = services
      .map(service => service.category?.trim())
      .filter(Boolean)
      .filter((category, index, list) => (
        list.findIndex(item => item.toLowerCase() === category.toLowerCase()) === index
      ));

    return [
      { key: "all", label: "All" },
      ...serviceCategories.map(category => ({ key: category, label: category }))
    ];
  }, [services]);

  const filtered = activeFilter === "all"
    ? services
    : services.filter(service => service.category?.toLowerCase() === activeFilter.toLowerCase());
  const visibleServices = filtered.slice(carouselIndex, carouselIndex + 3);
  const maxIndex = Math.max(0, filtered.length - 3);

  const handlePrev = () => setCarouselIndex(index => Math.max(0, index - 1));
  const handleNext = () => setCarouselIndex(index => Math.min(maxIndex, index + 1));

  useEffect(() => {
    setCarouselIndex(0);
  }, [activeFilter, services]);

  useEffect(() => {
    if (activeFilter !== "all" && !categories.some(category => category.key.toLowerCase() === activeFilter.toLowerCase())) {
      setActiveFilter("all");
    }
  }, [activeFilter, categories]);

  return (
    <>
      <Navbar />
      <main className="rewards-luxury-page">
        <section className="luxury-sanctuary">
          <div className="sanctuary-label">PREMIUM SERVICES</div>
          <p className="sanctuary-subtitle">
            Discover our exclusive premium services for an unforgettable stay.
          </p>
        </section>

        <section className="luxury-rewards-section">
          <div className="rewards-section-header">
            <div>
              <h3 className="section-label">CURATED FOR YOU</h3>
              <h2 className="section-title">Available Services</h2>
            </div>
            {filtered.length > 3 && (
              <div className="carousel-controls">
                <button className="carousel-btn" onClick={handlePrev} disabled={carouselIndex === 0}>{"\u2039"}</button>
                <button className="carousel-btn" onClick={handleNext} disabled={carouselIndex === maxIndex}>{"\u203a"}</button>
              </div>
            )}
          </div>

          <div className="service-filters" style={{ marginBottom: 32 }}>
            {categories.map(category => (
              <button
                key={category.key}
                className={`filter-btn ${activeFilter.toLowerCase() === category.key.toLowerCase() ? "active" : ""}`}
                onClick={() => setActiveFilter(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
              Loading services...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#b77b00" }}>
              No services available at this time.
            </div>
          ) : (
            <div className="rewards-carousel">
              {visibleServices.map((service, index) => (
                <div key={service.ServiceId || index} className="luxury-reward-card">
                  <div
                    className="reward-card-image"
                    style={{
                      backgroundImage: service.image
                        ? `url('http://localhost:9001${service.image}')`
                        : "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)"
                    }}
                  >
                    <div className="reward-card-cost">{parseFloat(service.price).toFixed(2)} EUR</div>
                  </div>
                  <div className="luxury-reward-content">
                    <h4 className="reward-title">{service.serviceName || service.name}</h4>
                    <p className="reward-desc">{service.description}</p>
                    <button
                      className="luxury-redeem-btn"
                      onClick={() => navigate("/services/book", { state: { service } })}
                    >
                      BOOK NOW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
