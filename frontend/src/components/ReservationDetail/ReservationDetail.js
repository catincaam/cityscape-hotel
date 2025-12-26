import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../Dashboard/Navbar';
import './ReservationDetail.css';

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
      
      // Fetch consumed services if invoice exists
      let services = [];
      if (reservationInvoice) {
        const servicesResponse = await fetch(`http://localhost:9001/api/consumed-services`);
        const allConsumed = await servicesResponse.json();
        services = allConsumed.filter(cs => cs.InvoiceId === reservationInvoice.invoiceId);
        
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
    if (!window.confirm('Ești sigur că vrei să anulezi această rezervare?')) return;
    
    try {
      const response = await fetch(`http://localhost:9001/api/reservations/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Rezervarea a fost anulată cu succes!');
        navigate('/dashboard');
      } else {
        alert('Eroare la anularea rezervării');
      }
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      alert('Eroare la anularea rezervării');
    }
  };

  const handlePayRemaining = () => {
    alert(`Procesare plată pentru ${calculateRemaining().toFixed(2)} RON`);
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
          <p>Se încarcă detaliile rezervării...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="reservation-detail-page">
        <Navbar />
        <div className="error-container">
          <h2>⚠️ Rezervare negăsită</h2>
          <p>{error || 'Nu am putut găsi această rezervare'}</p>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            Înapoi la Dashboard
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
  
  return (
    <div className="reservation-detail-page">
      <Navbar />
      
      <main className="detail-container">
        <div className="detail-header">
          <button onClick={() => navigate('/dashboard')} className="back-link">
            ← Înapoi la Dashboard
          </button>
          
          <div className="header-content">
            <div className="header-left">
              <h1>Detalii Rezervare <span className="res-id-header">#{reservation.reservationId}</span></h1>
              <p className="booking-date">
                📅 Rezervat pe: {new Date(reservation.createdAt || Date.now()).toLocaleDateString('ro-RO', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="header-actions">
              <button className="action-btn secondary">
                🖨️ Print
              </button>
              <button className="action-btn secondary">
                📤 Share
              </button>
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
                    <h2>{roomDetails?.RoomTheme?.roomName || 'Camera Deluxe'}</h2>
                    <p className="room-theme">Tematică: {roomDetails?.RoomTheme?.themeName || 'Modern'}</p>
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
                        {new Date(reservation.requestedCheckin).toLocaleDateString('ro-RO', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="check-time">După 14:00</p>
                    </div>
                  </div>
                  <div className="check-item check-out">
                    <div className="check-icon">🔒</div>
                    <div>
                      <p className="check-label">Check-out</p>
                      <p className="check-date">
                        {new Date(reservation.requestedCheckout).toLocaleDateString('ro-RO', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="check-time">Până la 11:00</p>
                    </div>
                  </div>
                </div>
                <div className="room-features">
                  <div className="feature-tag">
                    👥 {reservation.nrPeople || 2} {reservation.nrPeople === 1 ? 'Persoană' : 'Persoane'}
                  </div>
                  <div className="feature-tag">
                    🌙 {nights} {nights === 1 ? 'Noapte' : 'Nopți'}
                  </div>
                  <div className="feature-tag">
                    📶 Wi-Fi Gratuit
                  </div>
                </div>
              </div>
              {/* Services Card sub camera */}
              {consumedServices.length > 0 && (
                <div className="services-card" style={{marginTop: 32}}>
                  <h3>🛎️ Servicii Suplimentare Incluse</h3>
                  <div className="services-list">
                    {consumedServices.map((service, index) => (
                      <div key={index} className="service-item">
                        <div className="service-info">
                          <div className="service-icon">
                            {getCategoryIcon(service.category)}
                          </div>
                          <div>
                            <p className="service-name">{service.serviceName}</p>
                            <p className="service-quantity">Cantitate: {service.quantity}</p>
                          </div>
                        </div>
                        <span className="service-price">
                          {(parseFloat(service.price) * service.quantity).toFixed(2)} RON
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
              <h3>Sumar Plată</h3>
              
              <div className="summary-items">
                <div className="summary-row nights">
                  <span>Cazare ({nights} {nights === 1 ? 'noapte' : 'nopți'} x {pricePerNight.toFixed(2)} RON)</span>
                  <span>{roomTotal.toFixed(2)} RON</span>
                </div>
                {servicesTotal > 0 && (
                  <div className="summary-row services">
                    <span>Servicii Suplimentare</span>
                    <span>{servicesTotal.toFixed(2)} RON</span>
                  </div>
                )}
                <div className="summary-divider"></div>
                <div className="summary-row total">
                  <span>Total General</span>
                  <span className="total-amount">
                    {invoice ? parseFloat(invoice.totalAmount).toFixed(2) : roomTotal.toFixed(2)} RON
                  </span>
                </div>
              </div>

              {/* Payment Status */}
              <div className={`payment-status-card ${paymentStatus}`}>
                <div className="status-header">
                  <span className="status-label">
                    Status Plată: {paymentStatus === 'paid' ? 'Finalizată' : paymentStatus === 'partial' ? 'Parțială' : 'Neplătită'}
                  </span>
                  <span className={`status-badge ${paymentStatus}`}>
                    {paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                  </span>
                </div>
                
                {paymentStatus !== 'paid' && (
                  <>
                    <div className="payment-progress">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(totalPaid / parseFloat(invoice?.totalAmount || 1)) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="payment-amounts">
                      <span className="paid-amount">✅ Achitat: {totalPaid.toFixed(2)} RON</span>
                      <span className="remaining-amount">⏳ Rest: {remaining.toFixed(2)} RON</span>
                    </div>
                    
                    <button onClick={handlePayRemaining} className="pay-now-btn">
                      💳 Plătește restul acum
                    </button>
                  </>
                )}
                
                {paymentStatus === 'paid' && (
                  <div className="paid-message">
                    <p>✅ Plata a fost finalizată cu succes!</p>
                  </div>
                )}
              </div>

              {/* Cancellation Policy */}
              <div className="cancellation-policy">
                <h4>Politica de Anulare</h4>
                <div className="policy-info">
                  <span className="check-icon">✅</span>
                  <p>
                    Anulare gratuită până la{' '}
                    <strong>
                      {new Date(new Date(reservation.requestedCheckin).getTime() - 2 * 24 * 60 * 60 * 1000)
                        .toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                    {' '}(cu 48h înainte de check-in).
                  </p>
                </div>
                
                <button onClick={handleCancelReservation} className="cancel-reservation-btn">
                  ❌ Anulează Rezervarea
                </button>
              </div>
            </div>

            {/* Support Card */}
            <div className="support-card">
              <div className="support-icon">💬</div>
              <div>
                <p className="support-title">Ai nevoie de ajutor?</p>
                <a href="mailto:support@cityscapehotel.com" className="support-link">
                  Contactează suportul
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
