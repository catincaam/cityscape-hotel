import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./BookingSuccess.css";

export default function BookingSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    // Primește datele din location.state
    if (location.state?.bookingData) {
      setBookingDetails(location.state.bookingData);
    } else {
      // Dacă nu există date, redirect la dashboard
      navigate("/dashboard");
    }
  }, [location.state, navigate]);

  if (!bookingDetails) {
    return <div className="loading">Se încarcă...</div>;
  }

  const { reservation, invoice, payment } = bookingDetails;

  return (
    <div className="success-page">
      <div className="success-container">
        {/* HEADER SUCCESS */}
        <div className="success-header">
          <div className="success-icon">✓</div>
          <h1>Rezervare Confirmată!</h1>
          <p className="success-subtitle">
            Plata a fost procesată cu succes. Vei primi un email de confirmare în cel mai scurt timp.
          </p>
        </div>

        {/* RESERVATION DETAILS */}
        <div className="success-card">
          <h2>Detalii Rezervare</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">Cod Rezervare</span>
              <span className="value booking-code">#{reservation?.ReservationId}</span>
            </div>
            <div className="detail-item">
              <span className="label">Data Rezervării</span>
              <span className="value">
                {new Date(reservation?.reservationDate).toLocaleDateString("ro-RO")}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Check-in</span>
              <span className="value">
                {new Date(reservation?.requestedCheckin).toLocaleDateString("ro-RO")}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Check-out</span>
              <span className="value">
                {new Date(reservation?.requestedCheckout).toLocaleDateString("ro-RO")}
              </span>
            </div>
          </div>
        </div>

        {/* PAYMENT DETAILS */}
        <div className="success-card">
          <h2>Detalii Plată</h2>
          <div className="payment-summary">
            <div className="payment-row">
              <span>Total Factură</span>
              <span className="amount">{Number(invoice?.totalAmount).toFixed(2)} RON</span>
            </div>
            <div className="payment-row highlight">
              <span>Suma Plătită Acum</span>
              <span className="amount">{Number(payment?.amount).toFixed(2)} RON</span>
            </div>
            {bookingDetails.remainingAmount > 0 && (
              <div className="payment-row remaining">
                <span>Rest de Plată</span>
                <span className="amount">{Number(bookingDetails.remainingAmount).toFixed(2)} RON</span>
              </div>
            )}
            <div className="payment-status">
              <span className={`status-badge ${invoice?.status}`}>
                {invoice?.status === "paid" ? "Plătit Integral" : "Plătit Parțial"}
              </span>
            </div>
          </div>
        </div>

        {/* NEXT STEPS */}
        <div className="success-card next-steps">
          <h2>Ce urmează?</h2>
          <ul>
            <li>
              <span className="step-icon">📧</span>
              <div>
                <strong>Verifică emailul</strong>
                <p>Vei primi confirmarea rezervării cu toate detaliile.</p>
              </div>
            </li>
            <li>
              <span className="step-icon">📱</span>
              <div>
                <strong>Descarcă documentele</strong>
                <p>Poți descărca factura și voucherul din contul tău.</p>
              </div>
            </li>
            {bookingDetails.remainingAmount > 0 && (
              <li>
                <span className="step-icon">💳</span>
                <div>
                  <strong>Plată restantă</strong>
                  <p>Restul sumei va fi debitat cu 2 săptămâni înainte de check-in.</p>
                </div>
              </li>
            )}
            <li>
              <span className="step-icon">🏨</span>
              <div>
                <strong>Pregătește-te de călătorie</strong>
                <p>Check-in începe de la ora 14:00. Te așteptăm!</p>
              </div>
            </li>
          </ul>
        </div>

        {/* ACTIONS */}
        <div className="success-actions">
          <button 
            className="btn-primary"
            onClick={() => navigate("/dashboard")}
          >
            Înapoi la Dashboard
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate("/profile")}
          >
            Vezi Rezervările Mele
          </button>
        </div>
      </div>
    </div>
  );
}
