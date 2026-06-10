import Sequelize from "sequelize";
import db from "../dbConfig.js";

const EmailVerificationToken = db.define("EmailVerificationToken", {
  EmailVerificationTokenId: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ClientId: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  tokenHash: {
    type: Sequelize.STRING(255),
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: Sequelize.DATE,
    allowNull: false
  },
  usedAt: {
    type: Sequelize.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

export default EmailVerificationToken;
