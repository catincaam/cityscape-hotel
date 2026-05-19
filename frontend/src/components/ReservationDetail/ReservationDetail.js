import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../Dashboard/Navbar';
import { useNotification } from '../Notifications/NotificationProvider';
import { API_BASE_URL } from '../../config/runtimeUrls';
import './ReservationDetail.css';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EUR`;

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const ReservationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [reservationServices, setReservationServices] = useState([]);
  const [reservationRewards, setReservationRewards] = useState([]);
  const [clientData, setClientData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [payingRemaining, setPayingRemaining] = useState(false);

  const fetchReservationDetails = useCallback(async () => {
    try {
      setLoading(true);
      const resResponse = await fetch(`${API_BASE_URL}/api/reservations/${id}`);
      if (!resResponse.ok) throw new Error('Reservation not found');
      const resData = await resResponse.json();

      const roomReservation = resData.RoomReservations?.[0];
      const room = roomReservation?.Room;
      const theme = room?.RoomTheme;
      const reservationInvoice = resData.Invoice;

      let services = [];
      try {
        const reservationServicesResponse = await fetch(`${API_BASE_URL}/api/reservation-services/reservation/${id}`);
        if (reservationServicesResponse.ok) {
          const bookedServices = await reservationServicesResponse.json();
          services = Array.isArray(bookedServices)
            ? await Promise.all(bookedServices.map(async (rs) => {
                let serviceData = rs.Service || {};

                if (!serviceData.image && rs.ServiceId) {
                  try {
                    const serviceResponse = await fetch(`${API_BASE_URL}/api/services/${rs.ServiceId}`);
                    if (serviceResponse.ok) {
                      serviceData = { ...serviceData, ...(await serviceResponse.json()) };
                    }
                  } catch (serviceDetailsError) {
                    console.warn('Error fetching service image:', serviceDetailsError);
                  }
                }

                return {
                  ServiceId: rs.ServiceId,
                  quantity: rs.quantity || 1,
                  personDetails: rs.personDetails || null,
                  serviceName: serviceData.name || serviceData.serviceName || 'Service',
                  description: serviceData.description || '',
                  category: serviceData.category || '',
                  priceType: serviceData.priceType || 'per_booking',
                  image: resolveAssetUrl(serviceData.image || serviceData.imageUrl || serviceData.image_url || ''),
                  price: rs.unitPrice ?? serviceData.price ?? 0
                };
              }))
            : [];
        }
      } catch (servicesError) {
        console.warn('Error fetching reservation services:', servicesError);
      }

      if (reservationInvoice) {
        try {
          const servicesResponse = await fetch(`${API_BASE_URL}/api/consumed-services`);
          const allConsumed = await servicesResponse.json();
          const consumed = allConsumed.filter(cs => String(cs.InvoiceId) === String(reservationInvoice.InvoiceId));

          const consumedWithDetails = await Promise.all(
            consumed.map(async (cs) => {
              const serviceResponse = await fetch(`${API_BASE_URL}/api/services/${cs.ServiceId}`);
              const serviceData = await serviceResponse.json();
              return {
                ...cs,
                serviceName: serviceData.name || serviceData.serviceName || 'Service',
                description: serviceData.description || '',
                category: serviceData.category || '',
                priceType: serviceData.priceType || 'per_booking',
                image: resolveAssetUrl(serviceData.image || serviceData.imageUrl || serviceData.image_url || ''),
                price: cs.paidPrice ?? serviceData.price ?? 0
              };
            })
          );

          const bookedKeys = new Set(services.map(service => String(service.ServiceId)));
          services = [
            ...services,
            ...consumedWithDetails.filter(service => !bookedKeys.has(String(service.ServiceId)))
          ];
        } catch (servicesError) {
          console.warn('Error fetching consumed services:', servicesError);
        }
      }

      let rewards = [];
      try {
        const rewardsResponse = await fetch(`${API_BASE_URL}/api/rewards/reservation/${id}/applied`);
        if (rewardsResponse.ok) {
          const appliedRewards = await rewardsResponse.json();
          rewards = Array.isArray(appliedRewards)
            ? appliedRewards.map((reward) => ({
                id: reward.RewardPointId,
                title: reward.title || 'Reward',
                description: reward.description || '',
                category: reward.category || 'Reward',
                image: resolveAssetUrl(reward.image || ''),
                points: Number(reward.points || 0),
                redeemedAt: reward.redeemedAt
              }))
            : [];
        }
      } catch (rewardsError) {
        console.warn('Error fetching applied rewards:', rewardsError);
      }

      const mappedRoomDetails = room ? {
        RoomId: room.RoomId,
        RoomName: room.RoomName,
        RoomTheme: theme ? {
          RoomThemeId: theme.RoomThemeId,
          name: theme.name,
          theme: theme.theme,
          basePrice: theme.basePrice,
          city: theme.city,
          images: theme.images || [],
          showcaseImage: theme.showcaseImage
        } : null
      } : null;

      try {
        const token = localStorage.getItem('token');
        const clientResponse = await fetch(`${API_BASE_URL}/api/clients/${resData.ClientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (clientResponse.ok) {
          setClientData(await clientResponse.json());
        }
      } catch (clientError) {
        console.warn('Error fetching client details:', clientError);
      }

      setReservation(resData);
      setRoomDetails(mappedRoomDetails);
      setInvoice(reservationInvoice);
      setReservationServices(services);
      setReservationRewards(rewards);
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
    if (!reservation?.requestedCheckin || !reservation?.requestedCheckout) return 0;
    const checkIn = new Date(reservation.requestedCheckin);
    const checkOut = new Date(reservation.requestedCheckout);
    return Math.ceil(Math.abs(checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  const getPayments = () => invoice?.payments || invoice?.Payments || [];

  const calculateTotalPaid = () => {
    return getPayments().reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
  };

  const calculateRemaining = (total) => {
    return Math.max(0, total - calculateTotalPaid());
  };

  const handleDownloadReceipt = () => {
    if (!reservation) return;
    window.location.href = `${API_BASE_URL}/api/invoices/${reservation.ReservationId}/download-pdf`;
  };

  const handleCancelReservation = async () => {
    const confirmed = await confirm({
      title: 'Cancel reservation?',
      message: 'Are you sure you want to cancel this reservation? This action updates the reservation status immediately.',
      confirmText: 'Cancel stay',
      cancelText: 'Keep stay',
      tone: 'danger'
    });
    if (!confirmed) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/reservations/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        notify('Reservation cancelled successfully!', 'success');
        navigate('/dashboard');
      } else {
        const data = await response.json();
        notify(data.message || 'Error cancelling reservation', 'error');
      }
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      notify('Error cancelling reservation', 'error');
    }
  };

  const handlePayRemaining = async () => {
    if (!reservation || remaining <= 0) return;

    const confirmed = await confirm({
      title: 'Pay remaining balance?',
      message: `This will record the remaining payment of ${formatMoney(remaining)} for your reservation.`,
      confirmText: 'Pay balance',
      cancelText: 'Not now',
      tone: 'default'
    });
    if (!confirmed) return;

    try {
      setPayingRemaining(true);
      const response = await fetch(`${API_BASE_URL}/api/payments/pay-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ReservationId: reservation.ReservationId })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        notify(data.message || 'Could not process the remaining payment.', 'error');
        return;
      }

      notify('Remaining balance paid successfully.', 'success');
      await fetchReservationDetails();
    } catch (err) {
      console.error('Error paying remaining balance:', err);
      notify('Could not process the remaining payment.', 'error');
    } finally {
      setPayingRemaining(false);
    }
  };

  const galleryImages = useMemo(() => {
    const theme = roomDetails?.RoomTheme;
    const rawImages = [
      theme?.showcaseImage,
      ...(theme?.images || []).map(image => image?.imageUrl || image)
    ].filter(Boolean);

    const normalizeImage = (image) => {
      if (!image) return null;
      return image.startsWith('http') ? image : `${API_BASE_URL}${image}`;
    };

    return rawImages
      .map(normalizeImage)
      .filter(Boolean)
      .filter((image, index, list) => list.indexOf(image) === index);
  }, [roomDetails]);

  useEffect(() => {
    setSelectedImage(galleryImages[0] || null);
  }, [galleryImages]);

  if (loading) {
    return (
      <div className="reservation-detail-page booking-detail-page">
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
      <div className="reservation-detail-page booking-detail-page">
        <Navbar />
        <div className="error-container">
          <h2>Error Loading Reservation</h2>
          <p>{error || 'Could not find this reservation'}</p>
          <button onClick={() => navigate('/reservations')} className="back-btn">
            Back to Reservations
          </button>
        </div>
      </div>
    );
  }

  const nights = calculateNights();
  const totalPaid = calculateTotalPaid();
  const servicesTotal = reservationServices.reduce((sum, service) => {
    return sum + (parseFloat(service.price || 0) * (service.quantity || 1));
  }, 0);
  const primaryImage = selectedImage || galleryImages[0] || null;
  const pricePerNight = roomDetails?.RoomTheme?.basePrice ? parseFloat(roomDetails.RoomTheme.basePrice) : 0;
  const roomTotal = pricePerNight * nights;
  const accommodationTotal = roomTotal || Math.max(0, parseFloat(invoice?.totalAmount || 0) - servicesTotal);
  const displayTotal = invoice ? parseFloat(invoice.totalAmount || 0) : accommodationTotal + servicesTotal;
  const remaining = calculateRemaining(displayTotal);
  const reservationStatus = String(reservation.status || 'pending').toLowerCase();
  const isCancelled = reservationStatus === 'cancelled' || reservationStatus === 'canceled';
  const checkInDate = new Date(reservation.requestedCheckin);
  const checkOutDate = new Date(reservation.requestedCheckout);
  const now = new Date();
  const hoursUntilCheckin = (checkInDate - now) / (1000 * 60 * 60);
  const isCompletedStay = reservationStatus === 'completed' || checkOutDate < now;
  const paymentDeadlinePassed = !isCancelled && displayTotal > 0 && remaining > 0 && hoursUntilCheckin < 24;
  const isPaymentInactive = isCancelled || paymentDeadlinePassed;
  const paymentStatus = isPaymentInactive ? 'cancelled' : remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
  const reservationTimelineStatus = (() => {
    if (isCancelled || paymentDeadlinePassed) return 'cancelled';
    if (isCompletedStay) return 'completed';
    if (checkInDate <= now && now < checkOutDate) return 'active';
    if (now < checkInDate) return 'upcoming';
    return reservationStatus;
  })();
  const canCancelReservation = reservationTimelineStatus === 'upcoming';
  const canLeaveFeedback = reservationTimelineStatus === 'completed';
  const formatDate = (date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const guestCount = reservation.nrPeople || 1;
  const guestLabel = `${guestCount} ${guestCount === 1 ? 'Guest' : 'Guests'}`;
  const roomName = roomDetails?.RoomTheme?.name || roomDetails?.RoomName || 'Selected Room';
  const roomTheme = roomDetails?.RoomTheme?.theme || roomDetails?.RoomTheme?.city || 'Premium Suite';
  const progressPercent = displayTotal > 0 ? Math.min(100, (totalPaid / displayTotal) * 100) : 0;
  const handleAddService = () => {
    if (reservationTimelineStatus === 'active' || reservationStatus === 'active') {
      notify('Your stay is already active. Please speak with reception to add extra services during your stay.', 'info');
      return;
    }

    navigate('/services');
  };

  return (
    <div className="reservation-detail-page booking-detail-page">
      <Navbar />
      <main className="booking-shell">
        <section className="booking-hero-panel">
          <button className="booking-back-btn" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
          {primaryImage ? (
            <img src={primaryImage} alt={roomName} className="booking-hero-image" />
          ) : (
            <div className="booking-hero-fallback" />
          )}
          <div className="booking-hero-shade" />
          <div className="booking-hero-content">
            <h1>{roomName}</h1>
            <div className="booking-hero-meta">
              <span>{roomTheme}</span>
              <span>{guestLabel}</span>
            </div>
          </div>
          {galleryImages.length > 1 && (
            <div className="booking-image-gallery" aria-label="Room photos">
              {galleryImages.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  className={image === primaryImage ? 'active' : ''}
                  onClick={() => setSelectedImage(image)}
                  aria-label={`Show room photo ${index + 1}`}
                >
                  <img src={image} alt={`${roomName} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="booking-details-panel">
          <div className="booking-reference-row">
            <div>
              <p className="booking-label">Reservation Reference</p>
              <h2>#RES-{String(reservation.ReservationId).padStart(4, '0')}</h2>
            </div>
            <div className="booking-actions">
              <button type="button" onClick={handleDownloadReceipt}>Print</button>
              <button type="button">Share</button>
            </div>
          </div>

          <div className="booking-detail-grid">
            <div>
              <p className="booking-label">Check-in</p>
              <strong>{formatDate(checkInDate)}</strong>
              <span>From {formatTime(checkInDate)}</span>
            </div>
            <div>
              <p className="booking-label">Check-out</p>
              <strong>{formatDate(checkOutDate)}</strong>
              <span>Until {formatTime(checkOutDate)}</span>
            </div>
            <div>
              <p className="booking-label">Guests</p>
              <strong>{guestLabel}</strong>
              <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
            </div>
          </div>

          <div className="booking-section-heading">
            <p>Services & Rewards</p>
            {!isPaymentInactive && <button type="button" onClick={handleAddService}>Add Service</button>}
          </div>

          {reservationServices.length > 0 || reservationRewards.length > 0 ? (
            <div className="booking-services-list">
              {reservationServices.map((service, index) => (
                <div className="booking-service-row" key={`${service.ServiceId}-${index}`}>
                  {service.image ? (
                    <img src={service.image} alt={service.serviceName} className="booking-service-image" />
                  ) : (
                    <div className="booking-service-icon">{service.priceType === 'per_person' ? 'PP' : 'SV'}</div>
                  )}
                  <div className="booking-service-copy">
                    <strong>{service.serviceName}</strong>
                    <span>
                      {service.description || service.category || 'Hotel service'} - Qty {service.quantity}
                      {service.priceType === 'per_person' ? ' people' : ''}
                    </span>
                  </div>
                  <p>{formatMoney(parseFloat(service.price || 0) * (service.quantity || 1))}</p>
                </div>
              ))}
              {reservationRewards.map((reward) => (
                <div className="booking-service-row booking-reward-row" key={`reward-${reward.id}`}>
                  {reward.image ? (
                    <img src={reward.image} alt={reward.title} className="booking-service-image" />
                  ) : (
                    <div className="booking-service-icon reward">RW</div>
                  )}
                  <div className="booking-service-copy">
                    <strong>{reward.title}</strong>
                    <span>{reward.description || reward.category || 'Reward applied to this stay'}</span>
                  </div>
                  <p>{reward.points.toLocaleString()} pts</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="booking-empty-services">
              <p>No additional services or rewards booked.</p>
              {!isPaymentInactive && <button type="button" onClick={handleAddService}>Discover services</button>}
            </div>
          )}

          <div className={`booking-summary-card ${isPaymentInactive ? 'cancelled' : ''}`}>
            <div className="booking-summary-line">
              <span>Accommodation ({nights} {nights === 1 ? 'night' : 'nights'})</span>
              <strong>{formatMoney(accommodationTotal)}</strong>
            </div>
            <div className="booking-summary-line">
              <span>Services & Taxes</span>
              <strong>{formatMoney(servicesTotal)}</strong>
            </div>
            <div className="booking-summary-total">
              <span>Total Amount</span>
              <strong>{formatMoney(displayTotal)}</strong>
            </div>
            <div className="booking-progress-track">
              <div style={{ width: `${isCancelled ? 100 : progressPercent}%` }} />
            </div>
            <div className="booking-payment-status">
              <span className={`booking-status-dot ${paymentStatus}`}></span>
              <strong>
                {paymentStatus === 'cancelled'
                  ? paymentDeadlinePassed
                    ? 'Payment deadline passed'
                    : totalPaid > 0
                    ? 'Cancelled - payment no longer active'
                    : 'Cancelled - no payment due'
                  : paymentStatus === 'paid'
                    ? 'Full paid'
                    : paymentStatus === 'partial'
                      ? 'Partially paid'
                      : 'Payment pending'}
              </strong>
              <span>{reservation.reservationDate ? formatDate(new Date(reservation.reservationDate)) : formatDate(checkInDate)}</span>
            </div>
            {isPaymentInactive ? (
              <div className="booking-cancelled-note">
                <strong>{paymentDeadlinePassed ? 'Reservation no longer payable' : 'Reservation cancelled'}</strong>
                <span>
                  {paymentDeadlinePassed
                    ? 'The payment deadline has passed, so this stay can no longer be paid online.'
                    : totalPaid > 0
                    ? `This stay is no longer active. Paid amount recorded: ${formatMoney(totalPaid)}.`
                    : 'You cancelled this stay before completing payment.'}
                </span>
              </div>
            ) : paymentStatus !== 'paid' && reservationStatus !== 'completed' ? (
              <button className="booking-primary-btn" onClick={handlePayRemaining} disabled={payingRemaining}>
                {payingRemaining ? 'Processing...' : `Pay ${formatMoney(remaining)} now`}
              </button>
            ) : (
              <button className="booking-primary-btn" onClick={handleDownloadReceipt}>
                Download invoice
              </button>
            )}
          </div>

          <div className="booking-footer-actions">
            <div>
              <p className="booking-label">Primary Guest</p>
              <strong>{clientData?.FirstName || `Guest #${reservation.ClientId}`}</strong>
              <span>{clientData?.Email || 'guest@example.com'}</span>
            </div>
            <div className="booking-secondary-actions">
              {canCancelReservation && (
                <button type="button" onClick={handleCancelReservation}>Cancel Reservation</button>
              )}
              {canLeaveFeedback && (
                <button type="button" onClick={() => navigate(`/feedback/${reservation.ReservationId}`)}>
                  Leave Feedback
                </button>
              )}
              {!canCancelReservation && !canLeaveFeedback && (
                <span className="booking-action-note">
                  {reservationTimelineStatus === 'active'
                    ? 'Feedback becomes available after checkout.'
                    : reservationTimelineStatus === 'cancelled'
                      ? 'This reservation has been cancelled.'
                      : 'Actions are unavailable for this reservation.'}
                </span>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ReservationDetail;
