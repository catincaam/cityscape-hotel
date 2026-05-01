import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import DB_Init from "./entities/DB_Init.js";
// Import explicit pentru relații Sequelize corecte
import "./entities/Reservation.js";
import { seedAdmin } from "./seedAdmin.js";

// Routes
import authRouter from "./routes/authRouter.js";
import clientRouter from "./routes/ClientRouter.js";
import clientTypeRouter from "./routes/ClientTypeRouter.js";
import hotelRouter from "./routes/HotelRouter.js";
import roomRouter from "./routes/RoomRouter.js";
import roomThemeRouter from "./routes/roomThemeRouter.js";
import reservationRouter from "./routes/ReservationRouter.js";
import stayRouter from "./routes/StayRouter.js";
import invoiceRouter from "./routes/InvoiceRouter.js";
import paymentRouter from "./routes/PaymentRouter.js";
import serviceRouter from "./routes/ServiceRouter.js";
import consumedServiceRouter from "./routes/ConsumedServiceRouter.js";
import reservationServiceRouter from "./routes/ReservationServiceRouter.js";
import staffRouter from "./routes/StaffRouter.js";
import feedbackRouter from "./routes/FeedbackRouter.js";
import dashboardRouter from "./routes/DashboardRouter.js";
import adminDashboardRouter from "./routes/adminDashboardRouter.js";
import uploadRouter from "./routes/uploadRouter.js";
import emailRouter from "./routes/emailRouter.js";
import bookingRouter from "./routes/BookingRouter.js";
import rewardPointRouter from "./routes/RewardPointRouter.js";
import rewardRouter from "./routes/RewardRouter.js";
import adminAuthRouter from "./routes/adminAuthRouter.js";
import chatbotRouter from "./routes/ChatbotRouter.js";

dotenv.config();


const app = express();

// Pentru a folosi __dirname în ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** 1) Logging request */
app.use((req, res, next) => {
  console.log("REQ", req.method, req.url, "Origin:", req.headers.origin);
  next();
});

/** 2) CORS config */
const allowedOrigins = [
  "http://localhost:3007",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  process.env.APP_URL
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

/** 3) Body parsing */
app.use(express.json());

/** 3.5) Servim folderul uploads ca static */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/** 4) Routes */
app.use("/api/auth", authRouter);
app.use("/api/auth/admin", adminAuthRouter);
app.use("/api/admin/auth", adminAuthRouter);
app.use("/api/clients", clientRouter);
app.use("/api/client-types", clientTypeRouter);
app.use("/api/hotels", hotelRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/room-themes", roomThemeRouter);
app.use("/api/reservations", reservationRouter);
app.use("/api/stays", stayRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/services", serviceRouter);
app.use("/api/consumed-services", consumedServiceRouter);
app.use("/api/reservation-services", reservationServiceRouter);
app.use("/api/staff", staffRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api", dashboardRouter); //pentru dashboardul din frontend
app.use("/api/admin/dashboard", adminDashboardRouter); // pentru dashboard admin
app.use("/api/upload", uploadRouter); // pentru upload imagini
app.use("/api/email", emailRouter); // pentru trimitere email-uri
app.use("/api/booking", bookingRouter); // pentru procesul complet de booking
app.use("/api/reward-points", rewardPointRouter); // pentru puncte de recompensă
app.use("/api/rewards", rewardRouter); // pentru rewards
app.use("/api/chatbot", chatbotRouter); // pentru ai chatbot

/** 5) Root route */
app.get("/", (req, res) => {
  res.json({ message: "Cityscape Hotel backend works!" });
});



/** 6) Error handling */
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  res.status(500).json({
    message: "Internal server error",
    detail: err?.message,
    stack: err?.stack,
  });
});



/** 7) Init database */
DB_Init().then(() => seedAdmin()).catch((err) => console.error("DB init failed:", err));

const PORT = process.env.PORT || 9001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
