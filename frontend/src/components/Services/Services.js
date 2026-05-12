import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [loading, setLoading] = useState(true);
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

  const showcaseImage = resolveImageUrl(services.find((service) => service.image)?.image);

  const scrollToSelection = () => {
    document.getElementById("services-selection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
              <button type="button" onClick={scrollToSelection}>View selection</button>
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

        <section className="services-boutique-selection" id="services-selection">
          {loading ? (
            <div className="services-state">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="services-state">No services available at this time.</div>
          ) : (
            <>
            <div className="services-ledger-heading">
              <div>
                <p>Selection</p>
                <h2>The Boutique Service Collection</h2>
              </div>
              <button type="button" onClick={scrollToSelection}>Discover all offers</button>
            </div>
            <div className="boutique-service-grid">
              {services.map((service) => (
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
            </>
          )}
        </section>
      </main>
    </>
  );
}
