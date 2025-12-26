export default function DestinationCard({ data }) {
  return (
    <div className="card wide">
      <h3>Your Next Destination</h3>
      <p><strong>{data.city}</strong></p>
      <p>{data.room}</p>
      <p>
        {data.checkIn} → {data.checkOut}
      </p>

      <button className="primary-btn">Manage Booking</button>
    </div>
  );
}
