import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../Dashboard/Navbar';
import './ReservationDetail.css';

/**
 * TODO:
 * Extract API calls into a dedicated service layer
 * (ReservationService) to improve maintainability and readability.
 */

const ReservationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [consumedServices, setConsumedServices] = useState([]);
  const [error, setError] = useState(null);

  const fetchReservationDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch reservation with room details
      const resResponse = await fetch(`http://localhost:9001/api/reservations/${id}`);
      if (!resResponse.ok) throw new Error('Reservation not found');
      const resData = await resResponse.json();
      console.log('Reservation data:', resData);
      // Log all keys and values for reservation
      Object.entries(resData).forEach(([k,v]) => console.log('reservation field', k, v));
      
      // Fetch room theme to get room images
      const themeResponse = await fetch(`http://localhost:9001/api/room-themes/${resData.RoomThemeId}`);
      const themeData = await themeResponse.json();
      console.log('Theme data with images:', themeData);
      
      // Fetch room with theme for full details
      const roomResponse = await fetch(`http://localhost:9001/api/rooms/${resData.RoomId}`);
      const roomData = await roomResponse.json();
      roomData.RoomTheme = themeData; // Attach theme with images
      console.log('Complete room data:', roomData);
      
      // Fetch invoice with payments
      const invoiceResponse = await fetch(`http://localhost:9001/api/invoices`);
      const allInvoices = await invoiceResponse.json();
      const reservationInvoice = allInvoices.find(inv => inv.ReservationId === parseInt(id));
      if (reservationInvoice) {
        Object.entries(reservationInvoice).forEach(([k,v]) => console.log('invoice field', k, v));
      }
      console.log('All invoices:', allInvoices);
      console.log('Reservation invoice:', reservationInvoice);

      // Fetch consumed services if invoice exists
      let services = [];
      if (reservationInvoice) {
        const servicesResponse = await fetch(`http://localhost:9001/api/consumed-services`);
        const allConsumed = await servicesResponse.json();
        console.log('All consumed services:', allConsumed);
        allConsumed.forEach(cs => console.log('Consumed service InvoiceId:', cs.InvoiceId, typeof cs.InvoiceId));
        console.log('Reservation invoice InvoiceId:', reservationInvoice.InvoiceId, typeof reservationInvoice.InvoiceId);
        services = allConsumed.filter(cs => cs.InvoiceId == reservationInvoice.InvoiceId);
        console.log('Filtered services for invoiceId', reservationInvoice.InvoiceId, services);

        // Fetch service details for each consumed service
        const servicesWithDetails = await Promise.all(
          services.map(async (cs) => {
            const serviceResponse = await fetch(`http://localhost:9001/api/services/${cs.ServiceId}`);
            const serviceData = await serviceResponse.json();
            return {
              ...cs,
              serviceName: serviceData.serviceName,
              category: serviceData.category,
              price: serviceData.price
            };
          })
        );
        services = servicesWithDetails;
      }
      
      setReservation(resData);
      setRoomDetails(roomData);
      setInvoice(reservationInvoice);
      setConsumedServices(services);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reservation details:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReservationDetails();
  }, [fetchReservationDetails]);

  const calculateNights = () => {
    if (!reservation || !reservation.requestedCheckin || !reservation.requestedCheckout) return 0;
    const checkIn = new Date(reservation.requestedCheckin);
    const checkOut = new Date(reservation.requestedCheckout);
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateTotalPaid = () => {
    if (!invoice || !invoice.payments) return 0;
    return invoice.payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  };

  const calculateRemaining = () => {
    if (!invoice) return 0;
    return parseFloat(invoice.totalAmount) - calculateTotalPaid();
  };

  const getPaymentStatus = () => {
    const remaining = calculateRemaining();
    if (remaining <= 0) return 'paid';
    if (calculateTotalPaid() > 0) return 'partial';
    return 'unpaid';
  };

  const handleCancelReservation = async () => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      const response = await fetch(`http://localhost:9001/api/reservations/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        alert('Reservation cancelled successfully!');
        navigate('/dashboard');
      } else {
        const data = await response.json();
        alert(data.message || 'Error cancelling reservation');
      }
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      alert('Error cancelling reservation');
    }
  };

  const handlePayRemaining = () => {
    alert(`Procesare plătă pentru ${calculateRemaining().toFixed(2)} EUR`);
    // Aici poți implementa integrarea cu un payment gateway
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Spa': '💆',
      'Dining': '🍽️',
      'Experience': '🎯',
      'Transport': '🚗'
    };
    return icons[category] || '⭐';
  };

  if (loading) {
    return (
      <div className="reservation-detail-page">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading reservation details...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="reservation-detail-page">
        <Navbar />
        <div className="error-container">
          <h2>⚠️ Reservation not found</h2>
          <p>{error || 'Could not find this reservation'}</p>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const nights = calculateNights();
  const totalPaid = calculateTotalPaid();
  const remaining = calculateRemaining();
  const paymentStatus = getPaymentStatus();
  const servicesTotal = consumedServices.reduce((sum, cs) => sum + (parseFloat(cs.price) * cs.quantity), 0);
  // Get room images (array of imageUrl strings)
  const roomImages = roomDetails?.RoomTheme?.images || [];
  const primaryImage = roomImages[0];
  const thumbnails = roomImages.slice(1, 3);

  // Get price per night
  const pricePerNight = roomDetails?.RoomTheme?.basePrice
    ? parseFloat(roomDetails.RoomTheme.basePrice)
    : 0;
  const roomTotal = pricePerNight * nights;
  
  // Reservation status logic
  const reservationStatus = reservation.status || 'pending';
  const statusLabels = {
    pending: 'Unpaid',
    partial: 'Partial',
    paid: 'Paid',
    completed: 'Completed',
    cancelled: 'Cancelled',
    upcoming: 'Upcoming',
    active: 'Active',
    past: 'Past'
  };

  return (
    <div className="reservation-detail-page">
      <Navbar />
      <main className="detail-container">
        <div className="detail-header">
          <button onClick={() => navigate('/dashboard')} className="back-link">
            ← Back to Dashboard
          </button>
          <div className="header-content">
            <div className="header-left">
              <h1>Reservation Details <span className="res-id-header">#{reservation.reservationId}</span></h1>
              <p className="booking-date">
                📅 Booked on: {new Date(reservation.createdAt || Date.now()).toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
              <div className={`reservation-status-badge status-${reservationStatus}`} style={{marginTop: 8}}>
                Status: <strong>{statusLabels[reservationStatus]}</strong>
              </div>
            </div>
            <div className="header-actions">
              <button className="action-btn secondary">🖨️ Print</button>
              <button className="action-btn secondary">📤 Share</button>
            </div>
          </div>
        </div>
        <div className="detail-grid">
          <div className="detail-main">
            {/* Room Card + Services Card */}
            <div className="room-card">
              <div className="room-image-container">
                <img 
                  src={primaryImage ? `http://localhost:9001${primaryImage}` : '/placeholder-room.jpg'} 
                  alt={roomDetails?.RoomTheme?.roomName || 'Room'}
                  className="room-main-image"
                />
                <div className="room-badge">
                  {roomDetails?.RoomTheme?.category || 'Suită Premium'}
                </div>
                {thumbnails.length > 0 && (
                  <div className="image-thumbnails">
                    {thumbnails.map((img, idx) => (
                      <img 
                        key={idx}
                        src={`http://localhost:9001${img}`}
                        alt={`Thumbnail ${idx + 1}`}
                        className="thumbnail-image"
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="room-info">
                <div className="room-header">
                  <div>
                    <h2>{roomDetails?.RoomTheme?.roomName || 'Deluxe Room'}</h2>
                    <p className="room-theme">Theme: {roomDetails?.RoomTheme?.themeName || 'Modern'}</p>
                  </div>
                  <div className="rating">
                    {'⭐'.repeat(5)}
                  </div>
                </div>
                <div className="checkin-checkout-grid">
                  <div className="check-item">
                    <div className="check-icon">🔓</div>
                    <div>
                      <p className="check-label">Check-in</p>
                      <p className="check-date">
                        {new Date(reservation.requestedCheckin).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="check-time">After 2:00 PM</p>
                    </div>
                  </div>
                  <div className="check-item check-out">
                    <div className="check-icon">🔒</div>
                    <div>
                      <p className="check-label">Check-out</p>
                      <p className="check-date">
                        {new Date(reservation.requestedCheckout).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="check-time">Until 11:00 AM</p>
                    </div>
                  </div>
                </div>
                <div className="room-features">
                  <div className="feature-tag">
                    👥 {reservation.nrPeople || 2} {reservation.nrPeople === 1 ? 'Person' : 'People'}
                  </div>
                  <div className="feature-tag">
                    🌙 {nights} {nights === 1 ? 'Night' : 'Nights'}
                  </div>
                  <div className="feature-tag">
                    📶 Free Wi-Fi
                  </div>
                </div>
              </div>
              {/* Services Card under room */}
              {consumedServices.length > 0 && (
                <div className="services-card" style={{marginTop: 32}}>
                  <h3>🛎️ Included Extra Services</h3>
                  <div className="services-list">
                    {consumedServices.map((service, index) => (
                      <div key={index} className="service-item">
                        <div className="service-info">
                          <div className="service-icon">
                            {getCategoryIcon(service.category)}
                          </div>
                          <div>
                            <p className="service-name">{service.serviceName}</p>
                            <p className="service-quantity">Quantity: {service.quantity}</p>
                          </div>
                        </div>
                        <span className="service-price">
                          {(parseFloat(service.price) * service.quantity).toFixed(2)} EUR
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="detail-sidebar">
            <div className="payment-summary-card">
              <h3>Payment Summary</h3>
              <div className="summary-items">
                <div className="summary-row nights">
                  <span>Accommodation ({nights} {nights === 1 ? 'night' : 'nights'} x {pricePerNight.toFixed(2)} EUR)</span>
                  <span>{roomTotal.toFixed(2)} EUR</span>
                </div>
                {servicesTotal > 0 && (
                  <div className="summary-row services">
                    <span>Extra Services</span>
                    <span>{servicesTotal.toFixed(2)} EUR</span>
                  </div>
                )}
                <div className="summary-divider"></div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span className="total-amount">
                    {invoice ? parseFloat(invoice.totalAmount).toFixed(2) : roomTotal.toFixed(2)} RON
                  </span>
                </div>
              </div>
              {/* Payment Status */}
              <div className={`payment-status-card ${paymentStatus}`}>
                <div className="status-header">
                  <span className="status-label">
                    Payment Status: {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                  </span>
                  <span className={`status-badge ${paymentStatus}`}>
                    {paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                  </span>
                </div>
                {paymentStatus !== 'paid' && reservationStatus !== 'cancelled' && reservationStatus !== 'completed' && (
                  <>
                    <div className="payment-progress">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(totalPaid / parseFloat(invoice?.totalAmount || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="payment-amounts">
                      <span className="paid-amount">✅ Paid: {totalPaid.toFixed(2)} RON</span>
                      <span className="remaining-amount">⏳ Remaining: {remaining.toFixed(2)} RON</span>
                    </div>
                    <button onClick={handlePayRemaining} className="pay-now-btn">
                      💳 Pay remaining now
                    </button>
                  </>
                )}
                {paymentStatus === 'paid' && (
                  <div className="paid-message">
                    <p>✅ Payment completed successfully!</p>
                  </div>
                )}
                {(reservationStatus === 'cancelled') && (
                  <div className="cancelled-message">
                    <p>❌ This reservation has been cancelled.</p>
                  </div>
                )}
                {(reservationStatus === 'completed') && (
                  <div className="completed-message">
                    <p>🏁 This reservation is completed.</p>
                  </div>
                )}
              </div>
              {/* Cancellation Policy */}
              <div className="cancellation-policy">
                <h4>Cancellation Policy</h4>
                <div className="policy-info">
                  <span className="check-icon">✅</span>
                  <p>
                    Free cancellation until{' '}
                    <strong>
                      {new Date(new Date(reservation.requestedCheckin).getTime() - 2 * 24 * 60 * 60 * 1000)
                        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                    {' '} (48h before check-in).
                  </p>
                </div>
                {/* Show cancel button only if not already cancelled or completed */}
                {(reservationStatus !== 'cancelled' && reservationStatus !== 'completed') && (
                  <button onClick={handleCancelReservation} className="cancel-reservation-btn">
                    ❌ Cancel Reservation
                  </button>
                )}
              </div>
            </div>

            {/* Feedback Button */}
            <div className="feedback-card" style={{marginTop: 32, marginBottom: 24, textAlign: 'center'}}>
              <button
                className="feedback-btn"
                style={{
                  background: reservationStatus === 'completed' ? '#1f2937' : '#bdbdbd',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 32px',
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: reservationStatus === 'completed' ? 'pointer' : 'not-allowed',
                  opacity: reservationStatus === 'completed' ? 1 : 0.7
                }}
                onClick={e => {
                  if (reservationStatus === 'completed') {
                    navigate(`/feedback/${reservation.reservationId}`);
                  } else {
                    e.preventDefault();
                    alert('You can only leave feedback after your stay is completed.');
                  }
                }}
                disabled={false}
              >
                Leave Feedback
              </button>
              <div style={{fontSize: 13, color: '#617589', marginTop: 8}}>
                {reservationStatus === 'completed'
                  ? 'Share your experience with us!'
                  : 'Feedback is available after your stay is completed.'}
              </div>
            </div>
            {/* Support Card */}
            <div className="support-card">
              <div className="support-icon">💬</div>
              <div>
                <p className="support-title">Need help?</p>
                <a href="mailto:support@cityscapehotel.com" className="support-link">
                  Contact support
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReservationDetail;
