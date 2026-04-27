import Sequelize from 'sequelize';
import db from './dbConfig.js';
async function run() {
  try {
    const results = await db.query('SELECT r.ReservationId, r.status, r.createdAt, r.requestedCheckin, r.requestedCheckout, i.totalAmount, (SELECT SUM(p.amount) FROM Payment p WHERE p.InvoiceId = i.InvoiceId) as totalPaid FROM Reservation r LEFT JOIN Invoice i ON r.ReservationId = i.ReservationId WHERE i.totalAmount IS NULL OR i.totalAmount = 0', { type: Sequelize.QueryTypes.SELECT });
    console.log('QUERY_RESULT_START');
    console.log(JSON.stringify(results, null, 2));
    console.log('QUERY_RESULT_END');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
