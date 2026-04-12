import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Feedback = db.define("Feedback", {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    overall: { type: Sequelize.INTEGER, allowNull: true },
    cleanliness: { type: Sequelize.INTEGER, allowNull: true },
    service: { type: Sequelize.INTEGER, allowNull: true },
    theme: { type: Sequelize.INTEGER, allowNull: true },
    comment: { type: Sequelize.STRING(1000), allowNull: true },
    submissionDate: { type: Sequelize.DATE, allowNull: false },
    ClientId: { type: Sequelize.INTEGER, allowNull: false },
    ReservationId: { type: Sequelize.INTEGER, allowNull: false }
}, { timestamps: true });

export default Feedback;
