import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login/Login";
import ForgotPassword from "./components/Login/ForgotPassword";
import ResetPassword from "./components/Login/ResetPassword";
import Dashboard from "./components/Dashboard/Dashboard";
import Presentation from "./components/Presentation/Presentation";
import Booking from "./components/Booking/Booking";
import BookingSuccess from "./components/BookingSuccess/BookingSuccess";
import AdminPanel from "./components/Admin/AdminPanel";
import RoomDetails from "./components/RoomDetails/RoomDetails";
import Services from "./components/Services/Services";
import ProfilePage from "./components/Profile/ProfilePage";
import ReservationDetail from "./components/ReservationDetail/ReservationDetail";
import EmailTest from "./components/EmailTest/EmailTest";
import DayPasses from "./components/DayPasses/DayPasses";
import Rewards from "./components/Rewards/Rewards";
import RewardsDetails from "./components/RewardsDetails/RewardsDetails";
import AllReservations from "./components/Reservations/AllReservations";
import ProfileEdit from "./components/Profile/ProfileEdit";
import FeedbackPage from "./components/Feedback/FeedbackPage";
import ChatbotWidget from "./components/Chatbot/ChatbotWidget";
import ProtectedRoute from "./routes/ProtectedRoute";
import ServiceBooking from "./components/Services/ServiceBooking";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* PREZENTARE CAMERE (browse / explore) */}
        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <Presentation />
            </ProtectedRoute>
          }
        />

        {/* REZERVARE CAMERA */}
        <Route
          path="/booking"
          element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          }
        />

        {/* BOOKING SUCCESS */}
        <Route
          path="/booking-success"
          element={
            <ProtectedRoute>
              <BookingSuccess />
            </ProtectedRoute>
          }
        />

        {/* ADMIN PANEL */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* DETALII CAMERĂ */}
        <Route
          path="/room/:id"
          element={
            <ProtectedRoute>
              <RoomDetails />
            </ProtectedRoute>
          }
        />

        {/* SERVICII */}
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          }
        />

        {/* SERVICE BOOKING */}
        <Route
          path="/services/book"
          element={
            <ProtectedRoute>
              <ServiceBooking />
            </ProtectedRoute>
          }
        />

        {/* DAY PASSES */}
        <Route
          path="/day-passes"
          element={
            <ProtectedRoute>
              <DayPasses />
            </ProtectedRoute>
          }
        />

        {/* PROFIL */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* EDIT PROFILE */}
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <ProfileEdit />
            </ProtectedRoute>
          }
        />

        {/* DETALII REZERVARE */}
        <Route
          path="/reservation/:id"
          element={
            <ProtectedRoute>
              <ReservationDetail />
            </ProtectedRoute>
          }
        />

        {/* EMAIL TEST (dev only) */}
        <Route
          path="/email-test"
          element={
            <ProtectedRoute>
              <EmailTest />
            </ProtectedRoute>
          }
        />

        {/* REWARDS PAGE */}
        <Route
          path="/rewards"
          element={
            <ProtectedRoute>
              <Rewards />
            </ProtectedRoute>
          }
        />

        {/* REWARDS DETAILS PAGE */}
        <Route
          path="/rewards-details"
          element={
            <ProtectedRoute>
              <RewardsDetails />
            </ProtectedRoute>
          }
        />

        {/* ALL RESERVATIONS */}
        <Route
          path="/reservations"
          element={
            <ProtectedRoute>
              <AllReservations />
            </ProtectedRoute>
          }
        />

        {/* FEEDBACK PAGE */}
        <Route
          path="/feedback/:reservationId"
          element={
            <ProtectedRoute>
              <FeedbackPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ChatbotWidget />
    </BrowserRouter>
  );
}
