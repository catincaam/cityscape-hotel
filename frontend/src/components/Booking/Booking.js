import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";

import StepDatesGuests from "./components/steps/StepDatesGuests";
import StepRooms from "./components/steps/StepRooms";
import StepServices from "./components/steps/StepServices";
import StepConfirmation from "./components/steps/StepConfirmation";

import BookingStepper from "./components/BookingStepper";
import BookingFooter from "./components/BookingFooter";

import "./Booking.css";

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [bookingData, setBookingData] = useState({
    checkIn: "",
    checkOut: "",
    adults: 2,
    children: 0,
    room: null,
    services: {} // { serviceId: quantity }
  });

  // Verificăm dacă venim de la RoomDetails cu date
  useEffect(() => {
    if (location.state) {
      const { room, checkIn, checkOut, adults, children, goToStep } = location.state;
      
      console.log("📍 checkIn:", checkIn);
      console.log("📍 checkOut:", checkOut);
      console.log("📍 goToStep:", goToStep);
      console.log("📍 room:", room);
      
      // Setăm datele
      setBookingData(prev => ({
        ...prev,
        ...(checkIn && { checkIn }),
        ...(checkOut && { checkOut }),
        ...(adults && { adults }),
        ...(children && { children }),
        ...(room && { room })
      }));

      // Dacă avem goToStep, mergem direct la step-ul respectiv
      if (goToStep !== undefined) {
        console.log("🎯 Going to step:", goToStep);
        setStep(goToStep);
      }
    }
  }, [location.state]);

  /* =========================
     NAVIGARE PAS 1 → PAS 2
  ========================= */

  function goToStep2() {
    // ❗ NU mai afișăm mesaje de eroare vizuale
    // Validarea rămâne logică, dar silențioasă
    if (!bookingData.checkIn || !bookingData.checkOut) return;
    if (bookingData.checkOut <= bookingData.checkIn) return;

    setStep(2);
  }

  /* =========================
     SELECTARE CAMERĂ
  ========================= */

  function selectRoom(room) {
    setBookingData({ ...bookingData, room });
    // NU mai facem setStep(3) - rămânem pe step 2
  }

  function handleStepClick(newStep) {
    // Permite navigarea doar la pașii anteriori sau curent
    if (newStep <= step) {
      setStep(newStep);
    }
  }

  return (
    <>
      <Navbar />

      <div className="booking-shell">
        {/* STEPPER */}
        <BookingStepper step={step} onStepClick={handleStepClick} />

        {/* =========================
            PAS 1 – DATE & OASPEȚI
        ========================= */}
        {step === 1 && (
          <StepDatesGuests
            data={bookingData}
            setData={setBookingData}
            onContinue={goToStep2}
          />
        )}

        {/* =========================
            PAS 2 – CAMERE
        ========================= */}
        {step === 2 && (
          <>
            <div className="booking-hero">
              <div className="booking-hero-text">
                <h1>Alege Camera Perfectă</h1>
                <p>
                  Lasă-te inspirat de colecția noastră de camere tematice
                  internaționale.
                </p>
              </div>

            </div>

            <StepRooms
              bookingData={bookingData}
              onSelectRoom={selectRoom}
              onBack={() => setStep(1)}
            />
          </>
        )}

        {/* =========================
            PAS 3 – SERVICII
        ========================= */}
        {step === 3 && (
          <StepServices
            bookingData={bookingData}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            onUpdateServices={(services) =>
              setBookingData(prev => ({ ...prev, services }))
            }
          />
        )}

        {/* =========================
            PAS 4 – CONFIRMARE & PLATĂ
        ========================= */}
        {step === 4 && (
          <StepConfirmation
            bookingData={bookingData}
            onBack={() => setStep(3)}
            onComplete={(data) => {
              // Redirect către pagina de success cu datele rezervării
              navigate("/booking-success", { 
                state: { bookingData: data },
                replace: true 
              });
            }}
          />
        )}
      </div>

      {/* FOOTER FIX – DOAR LA PASUL 2 */}
      {step === 2 && (
        <BookingFooter
          bookingData={bookingData}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      )}
    </>
  );
}
