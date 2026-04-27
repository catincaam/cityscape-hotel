import Sequelize from 'sequelize';
import db from './dbConfig.js';
async function run() {
  try {
    const totalCount = await db.query('SELECT COUNT(*) as count FROM Reservation', { type: Sequelize.QueryTypes.SELECT });
    const issueCount = await db.query('SELECT COUNT(*) as count FROM Reservation r LEFT JOIN Invoice i ON r.ReservationId = i.ReservationId WHERE i.totalAmount IS NULL OR i.totalAmount = 0', { type: Sequelize.QueryTypes.SELECT });
    
    // Also check for zero payments
    const zeroPaymentCount = await db.query('SELECT COUNT(*) as count FROM Reservation r LEFT JOIN Invoice i ON r.ReservationId = i.ReservationId WHERE (SELECT SUM(amount) FROM Payment p WHERE p.InvoiceId = i.InvoiceId) IS NULL OR (SELECT SUM(amount) FROM Payment p WHERE p.InvoiceId = i.InvoiceId) = 0', { type: Sequelize.QueryTypes.SELECT });

    console.log('--- RECAP ---');
    console.log('Total Reservations: ' + totalCount[0].count);
    console.log('Reservations with missing/zero totalAmount: ' + issueCount[0].count);
    console.log('Reservations with missing/zero payment: ' + zeroPaymentCount[0].count);
    console.log('--- END RECAP ---');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
