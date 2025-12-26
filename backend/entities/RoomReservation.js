import Sequelize from "sequelize";
import db from "../dbConfig.js";

const RoomReservation = db.define("RoomReservation", {
    ReservationId: { type: Sequelize.INTEGER, primaryKey: true },
    RoomId: { type: Sequelize.INTEGER, primaryKey: true }
}, { timestamps: false });

export default RoomReservation;
