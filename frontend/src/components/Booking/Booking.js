import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../Dashboard/Navbar";
import StepDatesGuests from "./components/steps/StepDatesGuests";
import StepRooms from "./components/steps/StepRooms";
import StepServices from "./components/steps/StepServices";
import StepConfirmation from "./components/steps/StepConfirmation";
import BookingStepper from "./components/BookingStepper";
import { getBookingWindowMaxDate, isValidDateRange, isWithinBookingWindow } from "../../utils/validators";
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
    services: {}
  });
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    if (location.state) {
      const { room, checkIn, checkOut, adults, children, goToStep } = location.state;

      setBookingData({
        checkIn: checkIn || "",
        checkOut: checkOut || "",
        adults: adults || 2,
        children: children || 0,
        room: room || null,
        services: {}
      });

      if (goToStep !== undefined) {
        setStep(goToStep);
      }
    }
  }, [location.state]);

  function goToStep2() {
    setBookingError("");

    if (!bookingData.checkIn || !bookingData.checkOut) {
      setBookingError("Please choose both check-in and check-out dates.");
      return;
    }

    if (!isValidDateRange(bookingData.checkIn, bookingData.checkOut)) {
      setBookingError("Check-in must be before check-out.");
      return;
    }

    if (!isWithinBookingWindow(bookingData.checkIn, bookingData.checkOut)) {
      setBookingError(`Bookings are available up to ${getBookingWindowMaxDate()}.`);
      return;
    }

    if (Number(bookingData.adults) + Number(bookingData.children) < 1) {
      setBookingError("Please select at least one guest.");
      return;
    }

    setStep(2);
  }

  function selectRoom(room) {
    setBookingData({ ...bookingData, room });
  }

  function updateStayDates(checkIn, checkOut) {
    setBookingData((current) => ({
      ...current,
      checkIn,
      checkOut,
      room: null,
      services: {}
    }));
  }

  function handleStepClick(newStep) {
    if (newStep <= step) {
      setStep(newStep);
    }
  }

  const handleUpdateServices = useCallback((services) => {
    setBookingData((prev) => ({ ...prev, services }));
  }, []);

  return (
    <>
      <Navbar />

      <div className="booking-hero-premium">
        <div className="booking-hero-overlay"></div>
        <div className="booking-hero-content">
          <h1>Find Your Perfect Stay</h1>
          <p>Explore our curated collection of themed rooms and create unforgettable memories</p>
        </div>
      </div>

      <div className="booking-shell">
        <BookingStepper step={step} onStepClick={handleStepClick} />

        {step === 1 && (
          <StepDatesGuests
            data={bookingData}
            setData={setBookingData}
            onContinue={goToStep2}
            error={bookingError}
          />
        )}

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
              onChangeDates={updateStayDates}
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

        {step === 3 && (
          <StepServices
            bookingData={bookingData}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            onUpdateServices={handleUpdateServices}
          />
        )}

        {step === 4 && (
          <StepConfirmation
            bookingData={bookingData}
            onBack={() => setStep(3)}
            onComplete={(data) => {
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
