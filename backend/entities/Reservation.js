import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Reservation = db.define("Reservation", {
    ReservationId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    reservationDate: { type: Sequelize.DATE, allowNull: false },
    requestedCheckin: { type: Sequelize.DATE, allowNull: false },
    requestedCheckout: { type: Sequelize.DATE, allowNull: false },
    bookingMethod: { type: Sequelize.STRING(50), allowNull: true },
    nrPeople: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
    ClientId: { type: Sequelize.INTEGER, allowNull: false } // FK in DB_Init
}, { timestamps: true });

export default Reservation;
