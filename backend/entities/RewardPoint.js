import Sequelize from "sequelize";
import db from "../dbConfig.js";

const RewardPoint = db.define(
  "RewardPoint",
  {
    RewardPointId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    UserId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    ReservationId: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    amount: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM("pending", "active", "redeemed"),
      defaultValue: "pending"
    },
    description: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    availableAt: {
      type: Sequelize.DATE,
      allowNull: true
    }
  },
  { timestamps: true }
);

export default RewardPoint;
