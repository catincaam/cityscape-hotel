import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Service = db.define(
  "Service",
  {
    ServiceId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    name: {
      type: Sequelize.STRING(100),
      allowNull: false
    },

    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },

    category: {
      type: Sequelize.STRING(100),
      allowNull: false
    },

    price: {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: false
    },

    status: {
      type: Sequelize.STRING(50),
      defaultValue: "activ" // activ | indisponibil
    },

    bookableOnline: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },

    availableForExternalGuests: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },

    priceType: {
      type: Sequelize.STRING(50),
      defaultValue: "per_booking",
      allowNull: false,
      comment: "per_person or per_booking"
    },

    image: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "URL-ul imaginii serviciului"
    }
  },
  {
    timestamps: true
  }
);

export default Service;
