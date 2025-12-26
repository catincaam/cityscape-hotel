import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Feedback = db.define("Feedback", {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    serviceRating: { type: Sequelize.STRING(255), allowNull: true },
    submissionDate: { type: Sequelize.DATE, allowNull: false },
    ClientId: { type: Sequelize.INTEGER, allowNull: false }
}, { timestamps: true });

export default Feedback;
