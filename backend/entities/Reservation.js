import Sequelize from "sequelize";
import db from "../dbConfig.js";

// Statusuri posibile:
// 'pending' (neplătită), 'partial' (avans plătit), 'paid' (plătită integral),
// 'completed' (sejur finalizat și plătit), 'cancelled' (anulată), 'upcoming', 'active', 'past'
const Reservation = db.define("Reservation", {
    ReservationId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    reservationDate: { type: Sequelize.DATE, allowNull: false },
    requestedCheckin: { type: Sequelize.DATE, allowNull: false },
    requestedCheckout: { type: Sequelize.DATE, allowNull: false },
    bookingMethod: { type: Sequelize.STRING(50), allowNull: true },
    nrPeople: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
    ClientId: { type: Sequelize.INTEGER, allowNull: false }, // FK in DB_Init
    status: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'pending' }
}, { timestamps: true });

// Fix associations for eager loading
import RoomReservation from "./RoomReservation.js";
import Room from "./Room.js";
import RoomTheme from "./RoomTheme.js";
import Invoice from "./Invoice.js";

Reservation.hasMany(RoomReservation, { foreignKey: "ReservationId", as: "RoomReservations" });
RoomReservation.belongsTo(Reservation, { foreignKey: "ReservationId" });

RoomReservation.belongsTo(Room, { foreignKey: "RoomId", as: "Room" });
Room.hasMany(RoomReservation, { foreignKey: "RoomId" });

Room.belongsTo(RoomTheme, { foreignKey: "RoomThemeId", as: "RoomTheme" });
RoomTheme.hasMany(Room, { foreignKey: "RoomThemeId" });

Reservation.hasOne(Invoice, { foreignKey: "ReservationId", as: "Invoice" });
Invoice.belongsTo(Reservation, { foreignKey: "ReservationId" });

export default Reservation;
