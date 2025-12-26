import Sequelize from "sequelize";
import db from "../dbConfig.js";

const RoomImage = db.define(
  "RoomImage",
  {
    RoomImageId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    RoomThemeId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },

    imageUrl: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: "URL-ul imaginii (ex: /uploads/12345.png)"
    },

    isPrimary: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: "Marchează imaginea principală a temei"
    },

    orderIndex: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: "Ordinea de afișare a imaginii"
    }
  },
  {
    timestamps: true,
    tableName: "RoomImages"
  }
);

export default RoomImage;
