import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(".env") });
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
import Reward from "./Reward.js";
import RewardPoint from "./RewardPoint.js";
import Admin from "./Admin.js";
import PasswordResetToken from "./PasswordResetToken.js";
import Stay from "./Stay.js";

function setupFKs() {

  ClientType.hasMany(Client, { foreignKey: "TypeClientTip" });
  Client.belongsTo(ClientType, { foreignKey: "TypeClientTip" });


  Hotel.hasMany(Room, { foreignKey: "HotelId", onDelete: "CASCADE" });
  Room.belongsTo(Hotel, { foreignKey: "HotelId" });

 
  RoomTheme.hasMany(Room, { foreignKey: "RoomThemeId", onDelete: "RESTRICT" });
  Room.belongsTo(RoomTheme, { foreignKey: "RoomThemeId" });


  RoomTheme.hasMany(RoomImage, { foreignKey: "RoomThemeId", onDelete: "CASCADE", as: "images" });
  RoomImage.belongsTo(RoomTheme, { foreignKey: "RoomThemeId" });


  Client.hasMany(Reservation, { foreignKey: "ClientId", onDelete: "CASCADE" });
  Reservation.belongsTo(Client, { foreignKey: "ClientId" });

  
  Reservation.hasOne(Invoice, { foreignKey: "ReservationId", onDelete: "CASCADE" });
  Invoice.belongsTo(Reservation, { foreignKey: "ReservationId" });


  Reservation.hasMany(RoomReservation, { foreignKey: "ReservationId", onDelete: "CASCADE" });
  RoomReservation.belongsTo(Reservation, { foreignKey: "ReservationId" });

  RoomReservation.belongsTo(Room, { foreignKey: "RoomId" });
  Room.hasMany(RoomReservation, { foreignKey: "RoomId", onDelete: "CASCADE" });

  Reservation.belongsToMany(Room, { through: RoomReservation, foreignKey: "ReservationId", otherKey: "RoomId" });
  Room.belongsToMany(Reservation, { through: RoomReservation, foreignKey: "RoomId", otherKey: "ReservationId" });

  
  Reservation.hasMany(ReservationService, { foreignKey: "ReservationId", onDelete: "CASCADE" });
  ReservationService.belongsTo(Reservation, { foreignKey: "ReservationId" });


  Service.hasMany(ReservationService, { foreignKey: "ServiceId", onDelete: "RESTRICT" });
  ReservationService.belongsTo(Service, { foreignKey: "ServiceId" });

  Invoice.hasMany(ConsumedService, { foreignKey: "InvoiceId", onDelete: "CASCADE" });
  ConsumedService.belongsTo(Invoice, { foreignKey: "InvoiceId" });

  Service.hasMany(ConsumedService, { foreignKey: "ServiceId", onDelete: "CASCADE" });
  ConsumedService.belongsTo(Service, { foreignKey: "ServiceId" });

  Hotel.hasMany(Staff, { foreignKey: "HotelId", onDelete: "CASCADE" });
  Staff.belongsTo(Hotel, { foreignKey: "HotelId" });

  Client.hasMany(Feedback, { foreignKey: "ClientId", onDelete: "CASCADE" });
  Feedback.belongsTo(Client, { foreignKey: "ClientId" });

  Reservation.hasMany(Feedback, { foreignKey: "ReservationId", onDelete: "CASCADE" });
  Feedback.belongsTo(Reservation, { foreignKey: "ReservationId" });

  Invoice.hasMany(Payment, { foreignKey: "InvoiceId", onDelete: "CASCADE", as: "payments" });
  Payment.belongsTo(Invoice, { foreignKey: "InvoiceId" });

  Client.hasMany(PasswordResetToken, { foreignKey: "ClientId", onDelete: "CASCADE" });
  PasswordResetToken.belongsTo(Client, { foreignKey: "ClientId" });

  Client.hasMany(Stay, { foreignKey: "ClientId", onDelete: "CASCADE" });
  Stay.belongsTo(Client, { foreignKey: "ClientId" });

  Reservation.hasMany(Stay, { foreignKey: "ReservationId", onDelete: "CASCADE" });
  Stay.belongsTo(Reservation, { foreignKey: "ReservationId" });

  Room.hasMany(Stay, { foreignKey: "RoomId", onDelete: "CASCADE" });
  Stay.belongsTo(Room, { foreignKey: "RoomId" });

  Client.hasMany(RewardPoint, { foreignKey: "UserId", onDelete: "CASCADE" });
  RewardPoint.belongsTo(Client, { foreignKey: "UserId" });

  Reservation.hasMany(RewardPoint, { foreignKey: "ReservationId", onDelete: "CASCADE" });
  RewardPoint.belongsTo(Reservation, { foreignKey: "ReservationId" });
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

// la final, nu uita să exporți Reward dacă e nevoie
export { /* ...alte entități... */ Reward };

export default DB_Init;

