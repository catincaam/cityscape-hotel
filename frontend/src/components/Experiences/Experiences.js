import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import "../Rewards/Rewards.css";

export default function Experiences() {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:9001/api/services?category=Experiences")
      .then(res => res.json())
      .then(data => {
        setExperiences(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Carousel logic (same as Rewards)
  const visibleCards = 3;
  const maxIndex = Math.max(0, experiences.length - visibleCards);
  const handlePrev = () => setCarouselIndex(i => Math.max(0, i - 1));
  const handleNext = () => setCarouselIndex(i => Math.min(maxIndex, i + 1));

  return (
    <>
      <Navbar />
      <main className="rewards-luxury-page">
        {/* HERO SECTION */}
        <section className="luxury-sanctuary">
          <div className="sanctuary-label">PERSONAL EXPERIENCES</div>
          <div className="sanctuary-subtitle" style={{fontWeight:600, fontSize:20, marginBottom:8}}>
            Your journey to the extraordinary continues. Explore curated experiences for an unforgettable stay.
          </div>
        </section>

        {/* EXPERIENCES CAROUSEL */}
        <section style={{marginTop: 24}}>
          <div className="section-label" style={{marginBottom: 8}}>CURATED FOR YOU</div>
          <h2 className="rewards-section-title">AVAILABLE EXPERIENCES</h2>
          <div style={{position:'relative'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'flex-end', marginBottom:8}}>
              <button className="carousel-arrow" onClick={handlePrev} disabled={carouselIndex === 0}>&lt;</button>
              <button className="carousel-arrow" onClick={handleNext} disabled={carouselIndex === maxIndex}>&gt;</button>
            </div>
            <div className="rewards-carousel" style={{marginTop:0}}>
              {loading ? (
                <div style={{padding:'2rem', textAlign:'center'}}>Loading experiences...</div>
              ) : experiences.length === 0 ? (
                <div style={{padding:'2rem', textAlign:'center', color:'#b77b00'}}>No experiences available at this time.</div>
              ) : (
                experiences.slice(carouselIndex, carouselIndex + visibleCards).map(exp => (
                  <div className="reward-card" key={exp.ServiceId}>
                    <div className="reward-card-image" style={{backgroundImage: `url(http://localhost:9001${exp.image || '/default.jpg'})`}}></div>
                    <div className="reward-card-content">
                      <div className="reward-card-label" style={{background:'#e0e7ef', color:'#1f2937'}}>EXPERIENCE</div>
                      <div className="reward-card-title">{exp.serviceName}</div>
                      <div className="reward-card-desc">{exp.description}</div>
                      <div className="reward-card-points" style={{color:'#b77b00', fontWeight:700, fontSize:18}}>
                        {parseFloat(exp.price).toFixed(2)} EUR
                      </div>
                      <button className="reward-card-btn" style={{marginTop:12}} onClick={() => navigate(`/services/${exp.ServiceId}`)}>
                        Book Now
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
