import Sequelize from "sequelize";
import db from "../dbConfig.js";


const ConsumedService = db.define("ConsumedService", {
    InvoiceId: { type: Sequelize.INTEGER, primaryKey: true },
    ServiceId: { type: Sequelize.INTEGER, primaryKey: true },
    quantity: { type: Sequelize.INTEGER, allowNull: false },
    paidPrice: { type: Sequelize.DECIMAL(8,2), allowNull: true },
    // Pentru servicii per_person: lista persoane [{name, email}]
    personDetails: { type: Sequelize.JSON, allowNull: true, comment: "Array cu persoane pentru serviciile per_person" }
}, { timestamps: false });

export default ConsumedService;
