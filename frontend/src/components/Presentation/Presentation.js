import "./Presentation.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getRoomThemes } from "../../services/roomThemeService";
import { API_BASE_URL } from "../../config/runtimeUrls";

const displayNames = {
  Europa: "Europe",
  Lisabona: "Lisbon"
};

function formatDisplay(value) {
  return displayNames[value] || value || "";
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  });
}

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

        const showcases = themes
          .filter((theme) => theme.showcaseImage)
          .map((theme) => ({
            id: theme.RoomThemeId,
            title: formatDisplay(theme.city),
            img: `${API_BASE_URL}${theme.showcaseImage}`,
            continent: formatDisplay(theme.continent || "Other"),
            price: theme.basePrice
          }))
          .filter((item, index, self) =>
            index === self.findIndex((theme) => theme.title === item.title)
          );

        setCities(showcases);
        setContinents(["All", ...new Set(showcases.map((city) => city.continent))]);
      } catch (err) {
        console.error("Error loading themes:", err);
      } finally {
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
    return (
      <main className="presentation-page">
        <p className="presentation-loading">Loading destinations...</p>
      </main>
    );
  }

  return (
    <main className="presentation-page">
      <section className="presentation-hero">
        <div className="presentation-hero-overlay" />
        <div className="presentation-hero-content">
          <span>Cityscape Collection</span>
          <h1>Travel the world, one room at a time.</h1>
          <p>Discover signature stays inspired by captivating destinations and timeless city stories.</p>
          <button type="button" onClick={() => navigate("/booking")}>
            Explore Stays
          </button>
        </div>
      </section>

      <section className="presentation-filters" aria-label="Destination filters">
        {continents.map((continent) => (
          <button
            key={continent}
            className={filter === continent ? "active" : ""}
            onClick={() => setFilter(continent)}
            type="button"
          >
            {continent}
          </button>
        ))}
      </section>

      <section className="cities-grid">
        {filteredCities.length > 0 ? (
          filteredCities.map((city, index) => (
            <CityCard
              key={city.id}
              index={index}
              title={city.title}
              continent={city.continent}
              img={city.img}
              price={city.price}
              onClick={() => navigate("/booking")}
            />
          ))
        ) : (
          <p className="presentation-empty">No destinations to display.</p>
        )}
      </section>
    </main>
  );
}

function CityCard({ title, continent, img, price, index, onClick }) {
  return (
    <article className={`city-card city-card-${index % 4}`} onClick={onClick}>
      <div className="city-image-frame">
        <img src={img} alt={title} />
        <div className="city-overlay">
          <span>{continent}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <footer className="city-card-footer">
        <div>
          <span>From</span>
          <strong>{formatPrice(price)} / night</strong>
        </div>
        <button type="button">Explore -&gt;</button>
      </footer>
    </article>
  );
}
