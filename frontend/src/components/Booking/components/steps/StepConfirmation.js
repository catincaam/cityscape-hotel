import { useState, useEffect } from "react";
import "./StepConfirmation.css";
import { jwtDecode } from "jwt-decode";

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
        const res = await fetch("http://localhost:9001/api/services");
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

  const totalAmount = roomTotal + servicesTotal;

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
    const expiryDigits = expiry.replace(/\s|\/|/g, '');
    
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
      const response = await fetch("http://localhost:9001/api/booking/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          requestedCheckin: bookingData.checkIn,
          requestedCheckout: bookingData.checkOut,
          ClientId: clientId || 1,
          RoomId: bookingData.room?.id,
          nrPeople: (bookingData.adults || 1) + (bookingData.children || 0),
          totalAmount: totalAmount,
          paymentAmount: amountToPay,
          paymentType: paymentType,
          services: bookingData.services || {}
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        onComplete(data);
      } else {
        alert("Payment processing error: " + (data.message || "Unknown"));
      }
    } catch (err) {
      console.error(err);
      alert("Connection error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="confirmation-page">
      <div className="confirmation-layout">
        {/* LEFT SIDE - MAIN CONTENT */}
        <div className="confirmation-main">
          <div className="confirmation-header">
            <h1>Confirmation & Payment</h1>
            <p className="subtitle">Check the final details and choose your payment method.</p>
          </div>

          {/* SUMAR REZERVARE */}
          <div className="confirmation-card">
            <h2>
              <span className="icon">📋</span>
              Final Reservation Summary
            </h2>
            
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Room</span>
                <div className="value">{bookingData.room?.name || "—"}</div>
                <div className="meta">{bookingData.room?.theme || ""}</div>
              </div>
              
              <div className="summary-item">
                <span className="label">Guests</span>
                <div className="value">{bookingData.adults} {bookingData.adults === 1 ? 'Adult' : 'Adults'}</div>
                <div className="meta">Check-in: {bookingData.checkIn}</div>
              </div>
            </div>

            {Object.keys(bookingData.services || {}).length > 0 && (
              <div className="services-included">
                <h3>Included Extra Services</h3>
                <ul>
                  {Object.entries(bookingData.services).map(([id, qty]) => {
                    const service = services.find(s => s.ServiceId === Number(id));
                    return qty > 0 && (
                      <li key={id}>
                        <span>{service?.name || `Service #${id}`}</span>
                        <span>x{qty} = {service ? (qty * Number(service.price)).toFixed(2) : 0} RON</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* POLITICA DE ANULARE */}
          <div className="policy-card">
            <div className="policy-icon">🛡️</div>
            <div>
              <h3>Flexible Cancellation Policy</h3>
              <p>Free cancellation up to 48 hours before check-in. After this period, the first night will be charged.</p>
            </div>
          </div>

          {/* OPȚIUNI DE PLATĂ */}
          <div className="confirmation-card">
            <h2>
              <span className="icon">💳</span>
              Payment Options
            </h2>

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
                  <div className="option-title">Pay 20% now, the rest later</div>
                  <div className="option-desc">
                    Pay a deposit of <strong>{partialAmount} RON</strong> today. The rest will be charged automatically 24 hours before arrival.
                    {partialDisabled && (
                      <span style={{color: '#e11d48', fontWeight: 500, display: 'block', marginTop: 4}}>Partial payment is not available for check-in today or tomorrow.</span>
                    )}
                  </div>
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
                  <div className="option-title">Pay full amount now</div>
                  <div className="option-desc">
                    Pay the total of <strong>{totalAmount.toFixed(2)} RON</strong> and relax. Receive instant confirmation.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* DETALII CARD */}
          <div className="confirmation-card">
            <h2>
              <span className="icon">💳</span>
              Card Details
            </h2>

            <form onSubmit={handleSubmit} className="card-form">
              <div className="form-group">
                <label>Card Number</label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength="19"
                  required
                  className={errors.cardNumber ? 'error' : ''}
                />
                {errors.cardNumber && <span className="error-message">{errors.cardNumber}</span>}
              </div>

              <div className="form-group">
                <label>Cardholder Name</label>
                <input
                  type="text"
                  placeholder="e.g. JOHN DOE"
                  value={cardName}
                  onChange={handleCardNameChange}
                  required
                  className={errors.cardName ? 'error' : ''}
                />
                {errors.cardName && <span className="error-message">{errors.cardName}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    maxLength="7"
                    required
                    className={errors.expiry ? 'error' : ''}
                  />
                  {errors.expiry && <span className="error-message">{errors.expiry}</span>}
                </div>

                <div className="form-group">
                  <label>CVC / CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cvc}
                    onChange={handleCvcChange}
                    maxLength="3"
                    required
                    className={errors.cvc ? 'error' : ''}
                  />
                  {errors.cvc && <span className="error-message">{errors.cvc}</span>}
                </div>
              </div>

              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="save-card"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                />
                <label htmlFor="save-card">
                  Save card for secure future payments.
                </label>
              </div>
            </form>
          </div>

          <div className="confirmation-actions">
            <button type="button" onClick={onBack} className="btn-back">
              Back
            </button>
          </div>
        </div>

        {/* RIGHT SIDE - PAYMENT SUMMARY */}
        <aside className="payment-summary">
          <div className="summary-header">Total to Pay</div>
          
          <div className="summary-body">
            <div className="total-amount">{amountToPay} RON</div>
            <p className="total-note">Includes all taxes and services</p>

            <div className="summary-details">
              <div className="detail-row">
                <span className="label-small">Check-in</span>
                <div className="value-main">{bookingData.checkIn}</div>
                <div className="value-sub">after 2:00 PM</div>
              </div>

              <div className="detail-row">
                <span className="label-small">Check-out</span>
                <div className="value-main">{bookingData.checkOut}</div>
                <div className="value-sub">until 12:00 PM</div>
              </div>

              <div className="divider"></div>

              <div className="calc-row">
                <span>Duration</span>
                <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
              </div>

              <div className="calc-row">
                <span>{bookingData.room?.name} x {nights}</span>
                <span>{roomTotal.toFixed(2)} RON</span>
              </div>

              {servicesTotal > 0 && (
                <div className="calc-row">
                  <span>Extra Services</span>
                  <span>{servicesTotal.toFixed(2)} RON</span>
                </div>
              )}

              <div className="divider"></div>

              <div className="total-row">
                <span>TOTAL</span>
                <span>{totalAmount.toFixed(2)} RON</span>
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={isProcessing}
              className="btn-pay"
            >
              {isProcessing ? "Processing..." : `Pay ${amountToPay} RON`}
              <span className="lock-icon">🔒</span>
            </button>

            <div className="secure-note">
              <span className="lock-small">🔒</span>
              Secure payment via SSL
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
