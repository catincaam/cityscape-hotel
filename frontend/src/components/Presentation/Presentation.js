import "./Presentation.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getRoomThemes } from "../../services/roomThemeService";

export default function Presentation() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [continents, setContinents] = useState([]);

  useEffect(() => {
    async function loadShowcases() {
      try {
        const themes = await getRoomThemes();
        
        // Filtrezi doar temele care au showcaseImage
        const showcases = themes
          .filter(t => t.showcaseImage)
          .map(t => ({
            id: t.RoomThemeId,
            title: t.city,
            img: `http://localhost:9001${t.showcaseImage}`,
            continent: t.continent || "Other", // Dacă din DB nu ai continent, defaultează la "Other"
            theme: t.theme
          }))
          // Elimini duplicate pe baza city-ului (dacă sunt mai multe teme același oraș)
          .filter((item, index, self) =>
            index === self.findIndex(t => t.title === item.title)
          );
        
        setCities(showcases);
        
        // Extrag continentele unice
        const uniqueContinents = ["All", ...new Set(showcases.map(c => c.continent))];
        setContinents(uniqueContinents);
        setLoading(false);
      } catch (err) {
        console.error("Error loading themes:", err);
        setLoading(false);
      }
    }

    loadShowcases();
  }, []);

  const filteredCities =
    filter === "All"
      ? cities
      : cities.filter((city) => city.continent === filter);

  if (loading) {
    return <div className="presentation-page"><p>Loading...</p></div>;
  }

  return (
    <div className="presentation-page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1>
            Travel the world,<br />one room at a time.
          </h1>

          <p>
            Discover our themed rooms inspired by the world's most beautiful
            cities.
          </p>

          <button className="hero-btn" onClick={() => navigate("/booking")}>
            Book Room →
          </button>
        </div>
      </section>

      {/* FILTERS */}
      <section className="filters">
        {continents.map((c) => (
          <button
            key={c}
            className={filter === c ? "active" : ""}
            onClick={() => setFilter(c)}
          >
            {c === "All" ? "All" : c}
          </button>
        ))}
      </section>

      {/* CITIES GRID */}
      <section className="cities-grid">
        {filteredCities.length > 0 ? (
          filteredCities.map((city) => (
            <CityCard
              key={city.id}
              title={city.title}
              img={city.img}
              onClick={() => navigate("/booking")}
            />
          ))
        ) : (
          <p>No themes to display</p>
        )}
      </section>
    </div>
  );
}

function CityCard({ title, img, onClick }) {
  return (
    <div className="city-card" onClick={onClick}>
      <img src={img} alt={title} />
      <div className="city-overlay">
        <h3>{title}</h3>
        <span>Book Room →</span>
      </div>
    </div>
  );
}
