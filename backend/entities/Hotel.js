import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Hotel = db.define("Hotel", {
    HotelId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING(100), allowNull: false },
    address: { type: Sequelize.STRING(255), allowNull: false }
}, { timestamps: true });

export default Hotel;
