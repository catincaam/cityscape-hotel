import Sequelize from 'sequelize';
import db from './dbConfig.js';
async function run() {
  try {
    const res = await db.query('SELECT status, COUNT(*) as count FROM Reservation GROUP BY status', { type: Sequelize.QueryTypes.SELECT });
    console.log('Statuses:', JSON.stringify(res, null, 2));
    const inv = await db.query('SELECT COUNT(*) as count FROM Invoice WHERE totalAmount > 0', { type: Sequelize.QueryTypes.SELECT });
    console.log('Invoices > 0:', JSON.stringify(inv, null, 2));
    const pay = await db.query('SELECT SUM(amount) as totalPaid FROM Payment', { type: Sequelize.QueryTypes.SELECT });
    console.log('Total Paid:', JSON.stringify(pay, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();