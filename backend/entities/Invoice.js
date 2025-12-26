import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Invoice = db.define("Invoice", {
    InvoiceId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    issueDate: { type: Sequelize.DATE, allowNull: false },
    totalAmount: { type: Sequelize.DECIMAL(10,2), allowNull: true },
    status: { type: Sequelize.STRING(50), allowNull: true },
    ReservationId: { type: Sequelize.INTEGER, allowNull: false } //fk către Reservation
}, { timestamps: true });

export default Invoice;
