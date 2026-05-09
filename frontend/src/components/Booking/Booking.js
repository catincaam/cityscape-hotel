import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";

import StepDatesGuests from "./components/steps/StepDatesGuests";
import StepRooms from "./components/steps/StepRooms";
import StepServices from "./components/steps/StepServices";
import StepConfirmation from "./components/steps/StepConfirmation";

import BookingStepper from "./components/BookingStepper";

import "./Booking.css";
import { isValidDateRange } from "../../utils/validators";

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
  const [bookingError, setBookingError] = useState("");

  // Verificăm dacă venim de la RoomDetails cu date
  useEffect(() => {
    if (location.state) {
      const { room, checkIn, checkOut, adults, children, goToStep } = location.state;
      
      console.log("📍 State primit:", location.state);
      
      // Setăm datele
      const newData = {
        checkIn: checkIn || "",
        checkOut: checkOut || "",
        adults: adults || 2,
        children: children || 0,
        room: room || null,
        services: {}
      };
      
      setBookingData(newData);

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
    setBookingError("");
    if (!bookingData.checkIn || !bookingData.checkOut) {
      setBookingError("Please choose both check-in and check-out dates.");
      return;
    }
    if (!isValidDateRange(bookingData.checkIn, bookingData.checkOut)) {
      setBookingError("Check-in must be before check-out.");
      return;
    }
    if (Number(bookingData.adults) + Number(bookingData.children) < 1) {
      setBookingError("Please select at least one guest.");
      return;
    }

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

  const handleUpdateServices = useCallback((services) => {
    setBookingData(prev => ({ ...prev, services }));
  }, []);

  return (
    <>
      <Navbar />

      {/* PREMIUM HERO SECTION */}
      <div className="booking-hero-premium">
        <div className="booking-hero-overlay"></div>
        <div className="booking-hero-content">
          <h1>Find Your Perfect Stay</h1>
          <p>Explore our curated collection of themed rooms and create unforgettable memories</p>
        </div>
      </div>

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
            error={bookingError}
          />
        )}

        {/* =========================
            PAS 2 – CAMERE
        ========================= */}
        {step === 2 && (
          <>
            <div className="booking-hero">
              <div className="booking-hero-text">
                <h1>Choose the Perfect Room</h1>
                <p>
                  Get inspired by our collection of international themed rooms
                  and find your perfect match.
                </p>
              </div>

            </div>

            <StepRooms
              bookingData={bookingData}
              onSelectRoom={selectRoom}
              onBack={() => setStep(1)}
              onNext={() => {
                if (!bookingData.room) {
                  setBookingError("Please select a room before continuing.");
                  return;
                }
                setBookingError("");
                setStep(3);
              }}
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
            onUpdateServices={handleUpdateServices}
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


    </>
  );
}
