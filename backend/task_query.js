import Sequelize from 'sequelize';
import db from './dbConfig.js';
async function run() {
  try {
    const query = 'SELECT COUNT(*) as count FROM Reservation r JOIN Invoice i ON r.ReservationId = i.ReservationId WHERE r.status = \'active\' AND i.totalAmount > 0 AND (SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.InvoiceId = i.InvoiceId) >= (0.2 * i.totalAmount)';
    const results = await db.query(query, { type: Sequelize.QueryTypes.SELECT });
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