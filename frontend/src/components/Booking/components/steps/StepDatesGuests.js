import "./StepDatesGuests.css";

export default function StepDatesGuests({ data, setData, onContinue, error }) {
  const update = (field, value) => {
    setData({ ...data, [field]: value });
  };

  const nights = calculateNights(data.checkIn, data.checkOut);
  const guestLabel = [
    `${data.adults} ${data.adults === 1 ? "Adult" : "Adults"}`,
    data.children > 0 ? `${data.children} ${data.children === 1 ? "Child" : "Children"}` : null
  ].filter(Boolean).join(", ");

  return (
    <div className="step-wrapper">
      {/* HEADER */}
      <div className="step-header">
        <span className="step-eyebrow">Start your journey</span>
        <h1>Select Dates and Guests</h1>
        <p>
          Choose the perfect dates for your city escape and tell us
          how many explorers will join the adventure.
        </p>
      </div>

      <div className="step-grid">
        {/* STÂNGA */}
        <div>
          {/* PERIOADA */}
          <section className="card">
            <div className="card-header">
              <h3>Stay Period</h3>
              <p>Select check-in and check-out dates</p>
            </div>

            <div className="date-row">
              <DateField
                label="Check-in"
                value={data.checkIn}
                onChange={(v) => update("checkIn", v)}
                min={new Date().toISOString().split('T')[0]}
              />
              <DateField
                label="Check-out"
                value={data.checkOut}
                onChange={(v) => update("checkOut", v)}
                min={data.checkIn || new Date().toISOString().split('T')[0]}
              />
            </div>
          </section>

          {/* OASPEȚI */}
          <section className="card">
            <div className="card-header">
              <h3>Guest Configuration</h3>
              <p>Select your group composition</p>
            </div>

            <div className="guest-grid">
              <Guest
                label="Adults"
                subtitle="Age 12+"
                value={data.adults}
                onMinus={() => update("adults", Math.max(1, data.adults - 1))}
                onPlus={() => update("adults", data.adults + 1)}
              />
              <Guest
                label="Children"
                subtitle="2–12 years"
                value={data.children}
                onMinus={() =>
                  update("children", Math.max(0, data.children - 1))
                }
                onPlus={() => update("children", data.children + 1)}
              />
            </div>
          </section>

          <button className="continue-btn" onClick={onContinue}>
            Continue to Room Selection →
          </button>
          {error && <p className="booking-step-error">{error}</p>}
        </div>

        {/* DREAPTA – SUMAR */}
        <aside className="summary">
          <div className="summary-header">Booking Summary</div>

          <div className="summary-body">
            <Row label="Check-in" value={data.checkIn || "—"} />
            <Row label="Check-out" value={data.checkOut || "—"} />
            <Row label="Guests" value={guestLabel || "—"} />
            <Row label="Nights" value={nights ? `${nights} ${nights === 1 ? "night" : "nights"}` : "—"} />
            <Row label="Selected room" value="—" />
            <Row label="Price/night" value="—" />

            <div className="summary-total">
              <span>Estimated total</span>
              <strong>– €</strong>
            </div>
          </div>

          <div className="summary-actions">
            <button className="summary-btn summary-continue" onClick={onContinue}>
              Continue
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* SUBCOMPONENTE */

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return 0;
  }
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function DateField({ label, value, onChange, min }) {
  return (
    <div className="date-field">
      <label>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
      />
    </div>
  );
}

function Guest({ label, subtitle, value, onMinus, onPlus }) {
  return (
    <div className="guest-card">
      <div className="guest-info">
        <strong>{label}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="counter">
        <button onClick={onMinus}>−</button>
        <span className="counter-value">{value}</span>
        <button onClick={onPlus}>+</button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
