import "./CityCard.css";

export default function CityCard({ city }) {
  return (
    <div className="city-card">
      <img src={city.image} alt={city.name} />
      <div className="overlay">
        <h3>{city.name}</h3>
        <p>{city.description}</p>
        <span>de la €{city.priceFrom} / noapte</span>
      </div>
    </div>
  );
}
