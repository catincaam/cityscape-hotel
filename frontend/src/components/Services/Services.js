import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../Dashboard/Navbar";
import { API_BASE_URL } from "../../config/runtimeUrls";
import "./Services.css";

const resolveImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatPrice = (value) => `${Number(value || 0).toFixed(2)} EUR`;

export default function Services() {
  const [services, setServices] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/services`)
      .then((res) => res.json())
      .then((data) => {
        setServices(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const serviceCategories = services
      .map((service) => service.category?.trim())
      .filter(Boolean)
      .filter((category, index, list) => (
        list.findIndex((item) => item.toLowerCase() === category.toLowerCase()) === index
      ));

    return [
      { key: "all", label: "All" },
      ...serviceCategories.map((category) => ({ key: category, label: category }))
    ];
  }, [services]);

  const filtered = useMemo(() => {
    return activeFilter === "all"
      ? services
      : services.filter((service) => service.category?.toLowerCase() === activeFilter.toLowerCase());
  }, [activeFilter, services]);

  const visibleServices = filtered.slice(carouselIndex, carouselIndex + 3);
  const featuredServices = services.slice(0, 4);
  const showcaseImage = resolveImageUrl(services.find((service) => service.image)?.image);
  const maxIndex = Math.max(0, filtered.length - 3);

  const handlePrev = () => setCarouselIndex((index) => Math.max(0, index - 1));
  const handleNext = () => setCarouselIndex((index) => Math.min(maxIndex, index + 1));

  useEffect(() => {
    setCarouselIndex(0);
  }, [activeFilter, services]);

  useEffect(() => {
    if (activeFilter !== "all" && !categories.some((category) => category.key.toLowerCase() === activeFilter.toLowerCase())) {
      setActiveFilter("all");
    }
  }, [activeFilter, categories]);

  return (
    <>
      <Navbar />
      <main className="services-page">
        <section className="services-intro">
          <p>Premium Services</p>
          <h1>Discover our exclusive premium services for an unforgettable stay.</h1>
        </section>

        <section className="services-showcase">
          <div className="services-balance">
            <p>Your stay upgrades</p>
            <h2>Premium</h2>
            <span>Private rituals, dining, guided experiences and wellness appointments can be added to your confirmed reservation.</span>
            <div className="services-showcase-actions">
              <button type="button" onClick={() => setActiveFilter("all")}>View selection</button>
              <button type="button" className="ghost" onClick={() => navigate("/reservations")}>My stays</button>
            </div>
          </div>
          <div
            className={`services-visual ${showcaseImage ? "" : "empty"}`}
            style={showcaseImage ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0), rgba(46,35,21,0.08)), url("${showcaseImage}")` } : undefined}
          >
            <div className="services-visual-card">
              <strong>cityscape</strong>
              <em>"The details make the stay."</em>
            </div>
          </div>
        </section>

        <section className="services-collection-panel">
          <div className="services-section-header">
            <div>
              <p>Curated for you</p>
              <h2>Available Services</h2>
            </div>
            {filtered.length > 3 && (
              <div className="services-carousel-controls">
                <button type="button" onClick={handlePrev} disabled={carouselIndex === 0} aria-label="Previous services">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={handleNext} disabled={carouselIndex === maxIndex} aria-label="Next services">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="service-filters">
            {categories.map((category) => (
              <button
                key={category.key}
                className={`filter-btn ${activeFilter.toLowerCase() === category.key.toLowerCase() ? "active" : ""}`}
                onClick={() => setActiveFilter(category.key)}
                type="button"
              >
                {category.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="services-state">Loading services...</div>
          ) : filtered.length === 0 ? (
            <div className="services-state">No services available at this time.</div>
          ) : (
            <div className="services-card-grid">
              {visibleServices.map((service, index) => (
                <article key={service.ServiceId || index} className="premium-service-card">
                  <div className="premium-service-image">
                    {service.image ? (
                      <img src={resolveImageUrl(service.image)} alt={service.serviceName || service.name} />
                    ) : (
                      <div className="service-image-fallback" />
                    )}
                    <span>{formatPrice(service.price)}</span>
                  </div>
                  <div className="premium-service-content">
                    <p>{service.category || "Service"}</p>
                    <h3>{service.serviceName || service.name}</h3>
                    <span>{service.description}</span>
                    <button type="button" onClick={() => navigate("/services/book", { state: { service } })}>
                      Book now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {featuredServices.length > 0 && (
          <section className="services-boutique-selection">
            <div className="services-ledger-heading">
              <div>
                <p>Selection</p>
                <h2>The Boutique Service Collection</h2>
              </div>
              <button type="button" onClick={() => setActiveFilter("all")}>Discover all offers</button>
            </div>
            <div className="boutique-service-grid">
              {featuredServices.map((service) => (
                <article key={`featured-${service.ServiceId}`} className="boutique-service-card">
                  <div className="boutique-service-image">
                    {service.image ? (
                      <img src={resolveImageUrl(service.image)} alt={service.serviceName || service.name} />
                    ) : (
                      <div className="service-image-fallback" />
                    )}
                    <span>{formatPrice(service.price)}</span>
                  </div>
                  <p>{service.category || "Service"}</p>
                  <h3>{service.serviceName || service.name}</h3>
                  <span>{service.description}</span>
                  <button type="button" onClick={() => navigate("/services/book", { state: { service } })}>
                    Reserve service
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
