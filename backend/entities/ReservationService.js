import Sequelize from "sequelize";
import db from "../dbConfig.js";

const ReservationService = db.define("ReservationService", {
  ReservationId: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  ServiceId: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  quantity: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  unitPrice: {
    type: Sequelize.DECIMAL(8, 2),
    allowNull: false,
    comment: "Preț per unitate la momentul selectării"
  }
}, {
  timestamps: false,
  tableName: "ReservationServices"
});

export default ReservationService;
