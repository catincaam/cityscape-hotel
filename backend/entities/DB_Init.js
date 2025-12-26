import db from "../dbConfig.js";

// Entități
import Client from "./Client.js";
import ClientType from "./ClientType.js";
import Hotel from "./Hotel.js";
import Room from "./Room.js";
import RoomTheme from "./RoomTheme.js";
import RoomImage from "./RoomImage.js";
import Reservation from "./Reservation.js";
import Invoice from "./Invoice.js";
import Service from "./Service.js";
import ConsumedService from "./ConsumedService.js";
import ReservationService from "./ReservationService.js";
import Staff from "./Staff.js";
import Feedback from "./Feedback.js";
import RoomReservation from "./RoomReservation.js"; // tabela de legătură M:N
import Payment from "./Payment.js";

function setupFKs() {
  // ---------- ClientType 1 → N Client ----------
  ClientType.hasMany(Client, { foreignKey: "TypeClientTip" });
  Client.belongsTo(ClientType, { foreignKey: "TypeClientTip" });



  // ---------- Hotel 1 → N Room ----------
  Hotel.hasMany(Room, { foreignKey: "HotelId", onDelete: "CASCADE" });
  Room.belongsTo(Hotel, { foreignKey: "HotelId" });

   // RoomTheme → Room
  RoomTheme.hasMany(Room, { foreignKey: "RoomThemeId", onDelete: "RESTRICT" });
  Room.belongsTo(RoomTheme, { foreignKey: "RoomThemeId" });

  // ---------- RoomTheme 1 → N RoomImage (multiple poze per cameră) ----------
  RoomTheme.hasMany(RoomImage, { foreignKey: "RoomThemeId", onDelete: "CASCADE", as: "images" });
  RoomImage.belongsTo(RoomTheme, { foreignKey: "RoomThemeId" });

  // ---------- Client 1 → N Reservation ----------
  Client.hasMany(Reservation, { foreignKey: "ClientId", onDelete: "CASCADE" });
  Reservation.belongsTo(Client, { foreignKey: "ClientId" });

  // ---------- Reservation 1 → 1 Invoice ----------
  Reservation.hasOne(Invoice, { foreignKey: "ReservationId", onDelete: "CASCADE" });
  Invoice.belongsTo(Reservation, { foreignKey: "ReservationId" });

  // ---------- Reservation M ↔ N Room (RoomReservation) ----------
  Reservation.belongsToMany(Room, { through: RoomReservation, foreignKey: "ReservationId", otherKey: "RoomId" });
  Room.belongsToMany(Reservation, { through: RoomReservation, foreignKey: "RoomId", otherKey: "ReservationId" });

  // ---------- Reservation 1 → N ReservationService (servicii SELECTATE) ----------
  Reservation.hasMany(ReservationService, { foreignKey: "ReservationId", onDelete: "CASCADE" });
  ReservationService.belongsTo(Reservation, { foreignKey: "ReservationId" });

  // ---------- Service 1 → N ReservationService ----------
  Service.hasMany(ReservationService, { foreignKey: "ServiceId", onDelete: "RESTRICT" });
  ReservationService.belongsTo(Service, { foreignKey: "ServiceId" });

  // ---------- Invoice 1 → N ConsumedService ----------
  Invoice.hasMany(ConsumedService, { foreignKey: "InvoiceId", onDelete: "CASCADE" });
  ConsumedService.belongsTo(Invoice, { foreignKey: "InvoiceId" });

  // ---------- Service 1 → N ConsumedService ----------
  Service.hasMany(ConsumedService, { foreignKey: "ServiceId", onDelete: "CASCADE" });
  ConsumedService.belongsTo(Service, { foreignKey: "ServiceId" });

  // ---------- Hotel 1 → N Staff ----------
  Hotel.hasMany(Staff, { foreignKey: "HotelId", onDelete: "CASCADE" });
  Staff.belongsTo(Hotel, { foreignKey: "HotelId" });

  // ---------- Client 1 → N Feedback ----------
  Client.hasMany(Feedback, { foreignKey: "ClientId", onDelete: "CASCADE" });
  Feedback.belongsTo(Client, { foreignKey: "ClientId" });

  // ---------- Invoice 1 → N Payment ----------
  Invoice.hasMany(Payment, { foreignKey: "InvoiceId", onDelete: "CASCADE", as: "payments" });
  Payment.belongsTo(Invoice, { foreignKey: "InvoiceId" });
}

async function DB_Init() {
  try {
    setupFKs();

    await db.authenticate();
    await db.sync(); 
    console.log("Database connected & synced safely!");
  } catch (err) {
    console.error("DB_Init ERROR:", err);
  }
}

export default DB_Init;

