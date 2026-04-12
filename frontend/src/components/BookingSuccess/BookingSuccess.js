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
          <h1>Booking Confirmed!</h1>
          <p className="success-subtitle">
            Your payment was processed successfully. You will receive a confirmation email shortly.
          </p>
        </div>

        {/* RESERVATION DETAILS */}
        <div className="success-card">
          <h2>Booking Details</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">Booking Code</span>
              <span className="value booking-code">#{reservation?.ReservationId}</span>
            </div>
            <div className="detail-item">
              <span className="label">Booking Date</span>
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
          <h2>Payment Details</h2>
          <div className="payment-summary">
            <div className="payment-row">
              <span>Total Invoice</span>
              <span className="amount">{Number(invoice?.totalAmount).toFixed(2)} EUR</span>
            </div>
            <div className="payment-row highlight">
              <span>Amount Paid Now</span>
              <span className="amount">{Number(payment?.amount).toFixed(2)} EUR</span>
            </div>
            {bookingDetails.remainingAmount > 0 && (
              <div className="payment-row remaining">
                <span>Remaining Amount</span>
                <span className="amount">{Number(bookingDetails.remainingAmount).toFixed(2)} EUR</span>
              </div>
            )}
            <div className="payment-status">
              <span className={`status-badge ${invoice?.status}`}>
                {invoice?.status === "paid" ? "Paid in Full" : "Partially Paid"}
              </span>
            </div>
          </div>
        </div>

        {/* NEXT STEPS */}
        <div className="success-card next-steps">
          <h2>What's Next?</h2>
          <ul>
            <li>
              <span className="step-icon">📧</span>
              <div>
                <strong>Check your email</strong>
                <p>You will receive your booking confirmation with all details.</p>
              </div>
            </li>
            <li>
              <span className="step-icon">📱</span>
              <div>
                <strong>Download documents</strong>
                <p>You can download your invoice and voucher from your account.</p>
              </div>
            </li>
            {bookingDetails.remainingAmount > 0 && (
              <li>
                <span className="step-icon">💳</span>
                <div>
                  <strong>Outstanding payment</strong>
                  <p>The remaining amount will be charged 2 weeks before check-in.</p>
                </div>
              </li>
            )}
            <li>
              <span className="step-icon">🏨</span>
              <div>
                <strong>Get ready for your trip</strong>
                <p>Check-in starts at 2:00 PM. We look forward to welcoming you!</p>
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
            Back to Dashboard
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate("/profile")}
          >
            View My Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
