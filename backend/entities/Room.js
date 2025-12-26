import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Room = db.define(
  "Room",
  {
    RoomId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    floor: {
      type: Sequelize.INTEGER,
      allowNull: true
    },

    status: {
      type: Sequelize.STRING(50),
      allowNull: true
    },

    HotelId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },

    RoomThemeId: {
      type: Sequelize.INTEGER,
      allowNull: false
    }
  },
  { timestamps: true }
);

export default Room;
