import Sequelize from "sequelize";
import db from "../dbConfig.js";

const Payment = db.define("Payment", {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    amount: { type: Sequelize.DECIMAL(10,2), allowNull: false },
    paymentDate: { type: Sequelize.DATE, allowNull: false },
    InvoiceId: { type: Sequelize.INTEGER, allowNull: false },
    paymentType: { type: Sequelize.STRING(50), allowNull: true }
}, { timestamps: true });

export default Payment;
