import "./StepDatesGuests.css";

export default function StepDatesGuests({ data, setData, onContinue }) {
  const update = (field, value) => {
    setData({ ...data, [field]: value });
  };

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
              />
              <DateField
                label="Check-out"
                value={data.checkOut}
                onChange={(v) => update("checkOut", v)}
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
        </div>

        {/* DREAPTA – SUMAR */}
        <aside className="summary">
          <div className="summary-header">Booking Summary</div>

          <div className="summary-body">
            <Row label="Check-in" value={data.checkIn || "—"} />
            <Row label="Check-out" value={data.checkOut || "—"} />

            <div className="summary-guest">
              {data.adults} {data.adults === 1 ? 'Adult' : 'Adults'}
            </div>

            <div className="summary-divider" />

            <div className="summary-total">
              <span>Estimated total</span>
              <strong>— €</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* SUBCOMPONENTE */

function DateField({ label, value, onChange }) {
  return (
    <div className="date-field">
      <label>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
