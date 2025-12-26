import "./Presentation.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import tokyo from "../../assets/cities/tokyo.jpg";
import rome from "../../assets/cities/rome.jpg";
import shanghai from "../../assets/cities/shanghai.jpg";
import marrakech from "../../assets/cities/marrakech.jpg";
import kyoto from "../../assets/cities/kyoto.jpg";
import seoul from "../../assets/cities/seoul.jpg";

const CITIES = [
  { title: "Tokyo", img: tokyo, continent: "Asia" },
  { title: "Kyoto", img: kyoto, continent: "Asia" },
  { title: "Seoul", img: seoul, continent: "Asia" },
  { title: "Shanghai", img: shanghai, continent: "Asia" },
  { title: "Rome", img: rome, continent: "Europa" },
  { title: "Marrakech", img: marrakech, continent: "Africa" },
];

export default function Presentation() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  const filteredCities =
    filter === "All"
      ? CITIES
      : CITIES.filter((city) => city.continent === filter);

  return (
    <div className="presentation-page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1>
            Călătorește prin lume,<br />o cameră la un moment dat.
          </h1>

          <p>
            Descoperă camerele noastre tematice inspirate din cele mai frumoase
            orașe ale lumii.
          </p>

          <button className="hero-btn" onClick={() => navigate("/booking")}>
            Rezervă Cameră →
          </button>
        </div>
      </section>

      {/* FILTERS */}
      <section className="filters">
        {["All", "Asia", "Europa", "Africa"].map((c) => (
          <button
            key={c}
            className={filter === c ? "active" : ""}
            onClick={() => setFilter(c)}
          >
            {c === "All" ? "Toate" : c}
          </button>
        ))}
      </section>

      {/* CITIES GRID */}
      <section className="cities-grid">
        {filteredCities.map((city) => (
          <CityCard
            key={city.title}
            title={city.title}
            img={city.img}
            onClick={() => navigate("/booking")}
          />
        ))}
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
        <span>Rezervă Cameră →</span>
      </div>
    </div>
  );
}
