import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Stay = db.define("Stay", {
    StayId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    actualCheckin: { type: Sequelize.DATE, allowNull: false },
    actualCheckout: { type: Sequelize.DATE, allowNull: true },
    ClientId: { type: Sequelize.INTEGER, allowNull: false },
    ReservationId: { type: Sequelize.INTEGER, allowNull: false },
    RoomId: { type: Sequelize.INTEGER, allowNull: false }
}, { timestamps: true });

export default Stay;
