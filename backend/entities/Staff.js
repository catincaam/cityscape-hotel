import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Staff = db.define("Staff", {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: Sequelize.STRING(50), allowNull: false },
    lastName: { type: Sequelize.STRING(50), allowNull: false },
    role: { type: Sequelize.STRING(50), allowNull: false },
    HotelId: { type: Sequelize.INTEGER, allowNull: false } // FK către Hotel
}, { timestamps: true });

export default Staff;
