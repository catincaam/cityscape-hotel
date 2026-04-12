import "./BookingStepper.css";

export default function BookingStepper({ step, onStepClick }) {
  return (
    <div className="booking-stepper">
      <Step number={1} label="Search" active={step >= 1} completed={step > 1} onClick={() => onStepClick && onStepClick(1)} />
      <Line />
      <Step number={2} label="Rooms" active={step >= 2} completed={step > 2} onClick={() => onStepClick && onStepClick(2)} />
      <Line />
      <Step number={3} label="Services" active={step >= 3} completed={step > 3} onClick={() => onStepClick && onStepClick(3)} />
      <Line />
      <Step number={4} label="Confirmation" active={step >= 4} onClick={() => onStepClick && onStepClick(4)} />
    </div>
  );
}

function Step({ number, label, active, completed, onClick }) {
  return (
    <div className={`step-item ${active ? "active" : ""}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className={`step-circle ${completed ? "done" : ""}`}>
        {completed ? "✓" : number}
      </div>
      <span>{label}</span>
    </div>
  );
}

function Line() {
  return <div className="step-line" />;
}
