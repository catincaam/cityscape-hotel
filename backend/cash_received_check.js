import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
  }
);

async function run() {
  try {
    // Get all completed, not cancelled, fully paid reservations
    const query = `
      SELECT r.ReservationId, i.totalAmount, IFNULL(SUM(p.amount),0) as totalPaid, r.status
      FROM Reservation r
      JOIN Invoice i ON r.ReservationId = i.ReservationId
      LEFT JOIN Payment p ON i.InvoiceId = p.InvoiceId
      WHERE r.status != 'cancelled' AND r.status = 'completed'
      GROUP BY r.ReservationId, i.totalAmount, r.status
      HAVING totalPaid >= i.totalAmount
    `;
    const results = await sequelize.query(query, { type: QueryTypes.SELECT });
    const totalCash = results.reduce((sum, r) => sum + parseFloat(r.totalPaid || 0), 0);
    console.log('--- Completed, fully paid reservations ---');
    results.forEach(r => {
      console.log(`ID: ${r.ReservationId}, Status: ${r.status}, Paid: €${r.totalPaid}, Price: €${r.totalAmount}`);
    });
    console.log(`\nTotal Cash Received (completed, fully paid): €${totalCash.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`);
  } catch (error) {
    console.error('Error executing query:', error);
  } finally {
    await sequelize.close();
  }
}

run();
