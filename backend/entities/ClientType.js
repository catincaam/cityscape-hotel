import db from "../dbConfig.js";
import Sequelize from "sequelize";

const ClientType = db.define(
  "ClientType",
  {
    tip: {
      type: Sequelize.STRING(50),
      primaryKey: true,
      allowNull: false
    },
    discount: {
      type: Sequelize.DECIMAL(5,2)
    },
    benefits: {
      type: Sequelize.TEXT
    }
  },
  {
    timestamps: false // 🔥 FIX IMPORTANT
  }
);

export default ClientType;
