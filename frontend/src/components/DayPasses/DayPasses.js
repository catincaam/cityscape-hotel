import React, { useState, useEffect } from "react";
import Navbar from "../Dashboard/Navbar";
import { API_BASE_URL } from "../../config/runtimeUrls";
import "./DayPasses.css";

function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

const DayPasses = () => {
  const [selectedDate, setSelectedDate] = useState("2025-12-25");
  const [guests, setGuests] = useState("1 Persoană");
  const [activeCategory, setActiveCategory] = useState("Toate");
  const [cart, setCart] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [categories, setCategories] = useState(["Toate"]);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/services`);
        const data = await res.json();
        
        // Filtrăm doar serviciile active și rezervabile online
        const availableServices = data.filter(
          s => s.status === "activ" && s.bookableOnline
        );
        
        // Transformăm serviciile în format pentru experiențe
        const formattedExperiences = availableServices.map(service => ({
          id: service.ServiceId,
          title: service.name,
          description: service.description,
          price: Number(service.price),
          category: service.category,
          time: service.duration || "Disponibil",
          includes: service.additionalInfo || "Detalii disponibile",
          image: resolveAssetUrl(service.image),
          badge: service.category,
          badgeColor: getCategoryColor(service.category)
        }));
        
        setExperiences(formattedExperiences);
        
        // Extragem categoriile unice
        const uniqueCategories = ["Toate", ...new Set(availableServices.map(s => s.category))];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error("Eroare la încărcarea serviciilor:", err);
      }
    }
    loadServices();
  }, []);

  const getCategoryColor = (category) => {
    const colorMap = {
      "Wellness": "primary",
      "Spa": "primary",
      "Dining": "orange",
      "Restaurant": "orange",
      "Sport": "green",
      "Leisure": "green",
      "Activități": "green"
    };
    return colorMap[category] || "primary";
  };

  const addToCart = (experience) => {
    const existingItem = cart.find(item => item.id === experience.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === experience.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...experience, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  const filteredExperiences = activeCategory === "Toate" 
    ? experiences 
    : experiences.filter(exp => exp.category === activeCategory);

  return (
    <div className="day-passes-container">
      <Navbar />
      
      {/* Header */}
      <header className="day-passes-header">
        <div className="header-background">
          <div className="header-overlay"></div>
        </div>
        <div className="header-content">
          <h1>Day Passes & <span className="highlight">Experiențe</span></h1>
          <p>Nu ești cazat la noi? Nicio problemă. Bucură-te de facilitățile Cityscape Hotel pentru o zi. Spa, piscină, golf și gastronomie de top.</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="day-passes-main">
        <div className="content-wrapper">
          {/* Left Column - Experiences */}
          <div className="experiences-section">
            {/* Filters */}
            <div className="filters-card">
              <div className="filters-inputs">
                <div className="filter-group">
                  <label htmlFor="date">Alege Data</label>
                  <div className="input-with-icon">
                    <span className="input-icon">📅</span>
                    <input 
                      type="date" 
                      id="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="filter-group">
                  <label htmlFor="guests">Oaspeți</label>
                  <div className="input-with-icon">
                    <span className="input-icon">👥</span>
                    <select 
                      id="guests"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                    >
                      <option>1 Persoană</option>
                      <option>2 Persoane</option>
                      <option>3 Persoane</option>
                      <option>4+ Persoane</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="category-filters">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Cards Grid */}
            <div className="experiences-grid">
              {filteredExperiences.map(exp => (
                <div key={exp.id} className="experience-card">
                  {exp.image && (
                    <div className="card-image">
                      <img src={exp.image} alt={exp.title} />
                      <div className={`card-badge badge-${exp.badgeColor}`}>
                        {exp.badge}
                      </div>
                    </div>
                  )}
                  {!exp.image && (
                    <div className="card-image card-image-placeholder">
                      <div className="placeholder-content">
                        <span className="placeholder-icon">🏨</span>
                      </div>
                      <div className={`card-badge badge-${exp.badgeColor}`}>
                        {exp.badge}
                      </div>
                    </div>
                  )}
                  <div className="card-content">
                    <div className="card-header">
                      <h3>{exp.title}</h3>
                      <p className="card-description">{exp.description}</p>
                    </div>
                    <div className="card-details">
                      <span className="detail-item">
                        <span className="detail-icon">⏰</span>
                        {exp.time}
                      </span>
                      <span className="detail-separator">•</span>
                      <span className="detail-item">
                        <span className="detail-icon">✓</span>
                        {exp.includes}
                      </span>
                    </div>
                    <div className="card-footer">
                      <div className="card-price">
                        <span className="price-label">Preț / persoană</span>
                        <span className="price-value">{exp.price} RON</span>
                      </div>
                      <button 
                        className="add-btn"
                        onClick={() => addToCart(exp)}
                      >
                        Adaugă <span className="btn-icon">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Cart Summary */}
          <div className="cart-section">
            <div className="cart-sticky">
              <div className="cart-card">
                <div className="cart-header">
                  <h2>
                    <span className="cart-icon">🛍️</span>
                    Sumar Rezervare
                  </h2>
                  <span className="cart-badge">{cart.length} {cart.length === 1 ? 'Item' : 'Items'}</span>
                </div>
                
                <div className="cart-body">
                  {cart.length === 0 ? (
                    <div className="cart-empty">
                      <span className="empty-icon">🛒</span>
                      <p>Coșul este gol</p>
                      <span className="empty-subtitle">Adaugă experiențe pentru a continua</span>
                    </div>
                  ) : (
                    <>
                      <div className="cart-items">
                        {cart.map(item => (
                          <div key={item.id} className="cart-item">
                            <img src={item.image} alt={item.title} className="cart-item-image" />
                            <div className="cart-item-info">
                              <div className="cart-item-header">
                                <h4>{item.title}</h4>
                                <button 
                                  className="remove-btn"
                                  onClick={() => removeFromCart(item.id)}
                                >
                                  ×
                                </button>
                              </div>
                              <p className="cart-item-date">
                                {new Date(selectedDate).toLocaleDateString('ro-RO', { 
                                  weekday: 'short', 
                                  day: 'numeric', 
                                  month: 'short' 
                                })} • {guests}
                              </p>
                              <div className="cart-item-footer">
                                <div className="quantity-controls">
                                  <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                                  <span>{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                                </div>
                                <span className="cart-item-price">{item.price * item.quantity} RON</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="cart-totals">
                        <div className="total-row">
                          <span>Subtotal</span>
                          <span>{subtotal.toFixed(2)} RON</span>
                        </div>
                        <div className="total-row">
                          <span>Taxe (TVA inclus)</span>
                          <span>0.00 RON</span>
                        </div>
                        <div className="total-row total-final">
                          <span>Total</span>
                          <span>{total.toFixed(2)} RON</span>
                        </div>
                      </div>

                      <button className="checkout-btn">
                        Finalizează Comanda
                      </button>
                      <p className="checkout-note">
                        Fără plată în avans. Plătești la recepție.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="info-card">
                <span className="info-icon">ℹ️</span>
                <div>
                  <h5>Informații importante</h5>
                  <p>Check-in-ul pentru Day Passes se face la recepția principală. Vă rugăm prezentați email-ul de confirmare.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DayPasses;
