import "./StepDatesGuests.css";

export default function StepDatesGuests({ data, setData, onContinue }) {
  const update = (field, value) => {
    setData({ ...data, [field]: value });
  };

  return (
    <div className="step-wrapper">
      {/* HEADER */}
      <div className="step-header">
        <span className="step-eyebrow">Începe călătoria</span>
        <h1>Selectează Perioada și Oaspeții</h1>
        <p>
          Alege datele perfecte pentru escapada ta urbană și spune-ne
          câți exploratori vor participa la aventură.
        </p>
      </div>

      <div className="step-grid">
        {/* STÂNGA */}
        <div>
          {/* PERIOADA */}
          <section className="card">
            <div className="card-header">
              <h3>Perioada Sejurului</h3>
              <p>Selectează data de check-in și check-out</p>
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
              <h3>Configurare Oaspeți</h3>
              <p>Selectează componența grupului tău</p>
            </div>

            <div className="guest-grid">
              <Guest
                label="Adulți"
                subtitle="Vârsta 12+"
                value={data.adults}
                onMinus={() => update("adults", Math.max(1, data.adults - 1))}
                onPlus={() => update("adults", data.adults + 1)}
              />
              <Guest
                label="Copii"
                subtitle="2–12 ani"
                value={data.children}
                onMinus={() =>
                  update("children", Math.max(0, data.children - 1))
                }
                onPlus={() => update("children", data.children + 1)}
              />
            </div>
          </section>

          <button className="continue-btn" onClick={onContinue}>
            Continuă spre Alegerea Camerei →
          </button>
        </div>

        {/* DREAPTA – SUMAR */}
        <aside className="summary">
          <div className="summary-header">Sumar Rezervare</div>

          <div className="summary-body">
            <Row label="Check-in" value={data.checkIn || "—"} />
            <Row label="Check-out" value={data.checkOut || "—"} />

            <div className="summary-guest">
              {data.adults} Adulți
            </div>

            <div className="summary-divider" />

            <div className="summary-total">
              <span>Total estimat</span>
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
      <div>
        <strong>{label}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="counter">
        <button onClick={onMinus}>−</button>
        <span>{value}</span>
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
