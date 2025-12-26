import db from "../dbConfig.js";
import Sequelize from "sequelize";

const Client = db.define('Client', {
  ClientId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  FirstName: { type: Sequelize.STRING(50), allowNull: false },
  LastName: { type: Sequelize.STRING(50), allowNull: false },
  Email: { type: Sequelize.STRING(100), allowNull: false, unique: true },
  Password: { type: Sequelize.STRING(255), allowNull: false },
  TypeClientTip: { type: Sequelize.STRING(50) } // FK legat în DB_Init
}, { timestamps: true });

export default Client;
