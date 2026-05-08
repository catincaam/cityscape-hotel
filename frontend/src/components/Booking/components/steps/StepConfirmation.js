import { useState, useEffect } from "react";
import "./StepConfirmation.css";
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "../../../../config/runtimeUrls";

export default function StepConfirmation({ bookingData, onBack, onComplete }) {
  const [paymentType, setPaymentType] = useState("full"); // "partial" or "full"
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [services, setServices] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [errors, setErrors] = useState({});

  // Încarcă serviciile din backend
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/services`);
        const data = await res.json();
        setServices(data);
      } catch (err) {
        console.error("Error loading services:", err);
      }
    }
    loadServices();
  }, []);

  // Obține ClientId din token JWT
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded = jwtDecode(token);
        setClientId(decoded.id);
      }
    } catch (err) {
      console.error("Error decoding token:", err);
    }
  }, []);

  // Validează și formatează numărul cardului
  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, ''); // Remove spaces
    const onlyDigits = value.replace(/\D/g, ''); // Only digits
    
    if (onlyDigits.length <= 16) {
      // Format: 0000 0000 0000 0000
      const formatted = onlyDigits.match(/.{1,4}/g)?.join(' ') || onlyDigits;
      setCardNumber(formatted);
      
      // Validation
      if (onlyDigits.length > 0 && onlyDigits.length < 16) {
        setErrors(prev => ({ ...prev, cardNumber: 'Card number must be 16 digits' }));
      } else {
        setErrors(prev => ({ ...prev, cardNumber: '' }));
      }
    }
  };

  // Validează numele titularului (doar litere și spații)
  const handleCardNameChange = (e) => {
    const value = e.target.value.toUpperCase();
    // Permite doar litere, spații și caractere diacritice
    const onlyLetters = value.replace(/[^A-ZĂÂÎȘȚ\s]/g, '');
    setCardName(onlyLetters);
    
    if (onlyLetters.length > 0 && onlyLetters.length < 3) {
      setErrors(prev => ({ ...prev, cardName: 'Name must be at least 3 characters' }));
    } else {
      setErrors(prev => ({ ...prev, cardName: '' }));
    }
  };

  // Validează și formatează data expirării (MM/YY)
  const handleExpiryChange = (e) => {
    const value = e.target.value.replace(/\s/g, '');
    const onlyDigits = value.replace(/\D/g, '');
    
    if (onlyDigits.length <= 4) {
      let formatted = onlyDigits;
      if (onlyDigits.length >= 2) {
        formatted = onlyDigits.slice(0, 2) + ' / ' + onlyDigits.slice(2);
      }
      setExpiry(formatted);
      
      // Validare completă
      if (onlyDigits.length === 4) {
        const month = parseInt(onlyDigits.slice(0, 2));
        const year = parseInt('20' + onlyDigits.slice(2));
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        if (month < 1 || month > 12) {
          setErrors(prev => ({ ...prev, expiry: 'Invalid month (01-12)' }));
        } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
          setErrors(prev => ({ ...prev, expiry: 'Card is expired' }));
        } else {
          setErrors(prev => ({ ...prev, expiry: '' }));
        }
      } else if (onlyDigits.length > 0) {
        setErrors(prev => ({ ...prev, expiry: 'Format: MM / YY' }));
      } else {
        setErrors(prev => ({ ...prev, expiry: '' }));
      }
    }
  };

  // Validează CVC (3 cifre)
  const handleCvcChange = (e) => {
    const value = e.target.value;
    const onlyDigits = value.replace(/\D/g, '');
    
    if (onlyDigits.length <= 3) {
      setCvc(onlyDigits);
      
      if (onlyDigits.length > 0 && onlyDigits.length < 3) {
        setErrors(prev => ({ ...prev, cvc: 'CVC must be 3 digits' }));
      } else {
        setErrors(prev => ({ ...prev, cvc: '' }));
      }
    }
  };

  // Calculează numărul de nopți
  function calculateNights() {
    if (!bookingData.checkIn || !bookingData.checkOut) return 0;
    const start = new Date(bookingData.checkIn);
    const end = new Date(bookingData.checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const nights = calculateNights();
  const roomTotal = bookingData.room ? bookingData.room.basePrice * nights : 0;

  // Calculează totalul serviciilor
  const servicesTotal = Object.entries(bookingData.services || {}).reduce((sum, [id, qty]) => {
    const service = services.find(s => s.ServiceId === Number(id));
    return service ? sum + qty * Number(service.price) : sum;
  }, 0);

  const totalAmount = roomTotal;

  const partialAmount = (totalAmount * 0.2).toFixed(2);
  const amountToPay = paymentType === "partial" ? partialAmount : totalAmount.toFixed(2);

  // Disable partial payment if check-in is today or tomorrow
  let partialDisabled = false;
  if (bookingData.checkIn) {
    const checkInDate = new Date(bookingData.checkIn);
    const now = new Date();
    const diffTime = checkInDate.setHours(0,0,0,0) - now.setHours(0,0,0,0);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays < 2) partialDisabled = true;
  }
  // If partial is disabled and selected, force full
  if (partialDisabled && paymentType === "partial") setPaymentType("full");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validare finală înainte de submit
    const cardNumberDigits = cardNumber.replace(/\s/g, '');
    const expiryDigits = expiry.replace(/[\s/]/g, '');
    const normalizedExpiry = `${expiryDigits.slice(0, 2)}/${expiryDigits.slice(2)}`;
    
    const validationErrors = {};
    
    if (cardNumberDigits.length !== 16) {
      validationErrors.cardNumber = 'Card number must be 16 digits';
    }
    
    if (cardName.length < 3) {
      validationErrors.cardName = 'Cardholder name is required';
    }
    
    if (expiryDigits.length !== 4) {
      validationErrors.expiry = 'Expiry date is invalid';
    } else {
      const month = parseInt(expiryDigits.slice(0, 2));
      const year = parseInt('20' + expiryDigits.slice(2));
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      if (month < 1 || month > 12) {
        validationErrors.expiry = 'Invalid month';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        validationErrors.expiry = 'Card is expired';
      }
    }
    
    if (cvc.length !== 3) {
      validationErrors.cvc = 'CVC must be 3 digits';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsProcessing(true);

    try {
      // Aici vei face request la backend pentru a crea rezervarea
      const response = await fetch(`${API_BASE_URL}/api/booking/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          requestedCheckin: bookingData.checkIn,
          requestedCheckout: bookingData.checkOut,
          ClientId: clientId || 1,
          RoomId: bookingData.room?.roomId || bookingData.room?.RoomId || bookingData.room?.id,
          nrPeople: (bookingData.adults || 1) + (bookingData.children || 0),
          totalAmount: roomTotal,
          paymentAmount: amountToPay,
          paymentType: paymentType,
          cardNumber: cardNumberDigits,
          cardExpiry: normalizedExpiry,
          cardCVC: cvc,
          services: bookingData.services || {}
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Pass both API response and booking data with cost breakdown
        onComplete({
          ...data,
          room: bookingData.room,
          adults: bookingData.adults,
          children: bookingData.children,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          services: bookingData.services,
          costBreakdown: {
            roomTotal,
            servicesTotal,
            nights
          }
        });
      } else {
        console.error("Payment error:", data);
        alert("Payment processing error: " + (data.message || "Unknown"));
      }
    } catch (err) {
      console.error("Payment catch error:", err);
      alert("Connection error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="confirmation-wrapper">
      <div className="confirmation-container">
        
        {/* MAIN CONTENT */}
        <div className="confirmation-content">
          <div className="confirmation-intro">
            <span className="confirmation-eyebrow">Secure checkout</span>
            <h1 className="page-title">Finalize Reservation</h1>
            <p className="page-subtitle">Please select your preferred payment method to confirm your stay.</p>
          </div>

          {/* PAYMENT OPTIONS SECTION */}
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Payment Options</h2>
              <p className="section-subtitle">Select your preferred payment method</p>
            </div>
            <div className="payment-options">
              <label className={`payment-option ${paymentType === "partial" ? "selected" : ""} ${partialDisabled ? "disabled" : ""}`}>
                <input
                  type="radio"
                  name="payment-type"
                  value="partial"
                  checked={paymentType === "partial"}
                  onChange={(e) => setPaymentType(e.target.value)}
                  disabled={partialDisabled}
                />
                <div className="option-content">
                  <div className="option-title">20% DEPOSIT</div>
                  <div className="option-amount">€{partialAmount}</div>
                  <div className="option-desc">Pay deposit today. Balance charged 24h before arrival.</div>
                </div>
              </label>

              <label className={`payment-option ${paymentType === "full" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="payment-type"
                  value="full"
                  checked={paymentType === "full"}
                  onChange={(e) => setPaymentType(e.target.value)}
                />
                <div className="option-content">
                  <div className="option-title">FULL PAYMENT</div>
                  <div className="option-amount">€{totalAmount.toFixed(2)}</div>
                  <div className="option-desc">Pay full amount now. Instant confirmation.</div>
                </div>
              </label>
            </div>
          </div>

          {/* CARD DETAILS SECTION */}
          <div className="section">
            <div className="section-header payment-info-header">
              <div>
                <span className="payment-kicker">Encrypted payment</span>
                <h2 className="section-title">Payment Information</h2>
                <p className="section-subtitle">Enter your card details securely.</p>
              </div>
            </div>
            
            <form className="card-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label>Card Number</label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength="19"
                  className={errors.cardNumber ? 'error' : ''}
                />
                {errors.cardNumber && <span className="error">{errors.cardNumber}</span>}
              </div>

              <div className="form-field">
                <label>Cardholder Name</label>
                <input
                  type="text"
                  placeholder="JOHN DOE"
                  value={cardName}
                  onChange={handleCardNameChange}
                  className={errors.cardName ? 'error' : ''}
                />
                {errors.cardName && <span className="error">{errors.cardName}</span>}
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    maxLength="7"
                    className={errors.expiry ? 'error' : ''}
                  />
                  {errors.expiry && <span className="error">{errors.expiry}</span>}
                </div>

                <div className="form-field">
                  <label>CVC</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cvc}
                    onChange={handleCvcChange}
                    maxLength="3"
                    className={errors.cvc ? 'error' : ''}
                  />
                  {errors.cvc && <span className="error">{errors.cvc}</span>}
                </div>
              </div>

              <div className="security-info">
                <span>Your payment is encrypted and secure</span>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">Booking Summary</div>
          <div className="sidebar-body">
            <div className="guest-summary">
              <div className="guest-count">{bookingData.adults + bookingData.children} {bookingData.adults + bookingData.children === 1 ? 'Guest' : 'Guests'}</div>
              <div className="guest-breakdown">{bookingData.adults} Adult{bookingData.adults !== 1 ? 's' : ''}{bookingData.children > 0 && `, ${bookingData.children} Child${bookingData.children !== 1 ? 'ren' : ''}`}</div>
            </div>

            <div className="divider"></div>

            <div className="booking-info">
              <div className="info-row">
                <span className="info-label">Check-in</span>
                <span className="info-value">{bookingData.checkIn}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Check-out</span>
                <span className="info-value">{bookingData.checkOut}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Duration</span>
                <span className="info-value">{nights} Night{nights !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="divider"></div>

            <div className="cost-breakdown">
              <div className="breakdown-row">
                <span>{bookingData.room?.name || 'Room'}</span>
                <span>€{roomTotal.toFixed(2)}</span>
              </div>
              {servicesTotal > 0 && (
                <div className="breakdown-row">
                  <span>Services due at hotel</span>
                  <span>€{servicesTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="divider"></div>
              <div className="breakdown-total">
                <span>TOTAL DUE NOW</span>
                <span>€{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="amount-to-pay">
              <p className="pay-label">Amount to Pay Now</p>
              <div className="total-amount">€{amountToPay}</div>
            </div>

            <button onClick={handleSubmit} disabled={isProcessing} className="btn-pay-sidebar">
              PAY NOW
            </button>

            <div className="policy-box">
              <div>
                <strong>Flexible Cancellation</strong>
                <p>Free cancellation up to 24 hours before check-in</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
