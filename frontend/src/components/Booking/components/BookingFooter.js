import "./BookingFooter.css";

export default function BookingFooter({ bookingData, onBack, onContinue }) {
  return (
    <div className="booking-footer">
      <button className="footer-back" onClick={onBack}>
        ← Înapoi
      </button>

      <div className="footer-summary">
        <span>Camera selectată</span>
        <strong>
          {bookingData.room ? bookingData.room.name : "—"}
        </strong>
      </div>

      <button
        className="footer-continue"
        disabled={!bookingData.room}
        onClick={onContinue}
      >
        Continuă →
      </button>
    </div>
  );
}
