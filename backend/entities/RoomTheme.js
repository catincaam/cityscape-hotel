import Sequelize from "sequelize";
import db from "../dbConfig.js";

const RoomTheme = db.define(
  "RoomTheme",
  {
    RoomThemeId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    city: {
      type: Sequelize.STRING(100),
      allowNull: false
    },

    theme: {
      type: Sequelize.STRING(100),
      allowNull: false
    },

    name: {
      type: Sequelize.STRING(150),
      allowNull: false
    },

    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },

    basePrice: {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: false
    },

    image: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "Imaginea principală (deprecated, folosim RoomImages)"
    },

    amenities: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Array de amenități: ['WiFi', 'Mic dejun', 'Jacuzzi', etc]"
    },

    maxGuests: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 2
    },

    size: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Dimensiune în mp"
    },

    bedType: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: "ex: King, Queen, Twin, etc"
    }
  },
  {
    timestamps: false
  }
);

export default RoomTheme;
