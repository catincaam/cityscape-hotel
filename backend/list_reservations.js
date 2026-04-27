import Sequelize from 'sequelize';
import db from './dbConfig.js';
async function run() {
  try {
    const results = await db.query('SELECT ReservationId, status, requestedCheckin, requestedCheckout FROM Reservation', { type: Sequelize.QueryTypes.SELECT });
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
