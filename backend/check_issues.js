
import db from './dbConfig.js';
import Reservation from './entities/Reservation.js';
import Client from './entities/Client.js';
import Invoice from './entities/Invoice.js';
import Payment from './entities/Payment.js';
import DB_Init from './entities/DB_Init.js';

async function run() {
  try {
    await DB_Init();

    const reservations = await Reservation.findAll({
      include: [
        { model: Client },
        { 
          model: Invoice, 
          as: 'Invoice',
          include: [{ model: Payment, as: 'payments' }]
        }
      ]
    });

    const issues = [];

    for (const res of reservations) {
      const invoice = res.Invoice;
      const guest = res.Client ? (res.Client.FirstName + ' ' + res.Client.LastName) : 'Unknown';
      const totalPrice = invoice ? parseFloat(invoice.totalAmount || 0) : 0;
      const payments = (invoice && invoice.payments) ? invoice.payments : [];
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      let resIssues = [];
      if (totalPrice <= 0) resIssues.push('Price <= 0');
      if (totalPaid < totalPrice) resIssues.push('Underpaid');
      if (!res.reservationDate || !res.requestedCheckin || !res.requestedCheckout) resIssues.push('Missing Dates');

      if (resIssues.length > 0) {
        issues.push({
          ReservationId: res.ReservationId,
          guest,
          price: totalPrice,
          paid: totalPaid,
          status: res.status,
          issues: resIssues.join(', ')
        });
      }
    }

    if (issues.length > 0) {
      console.log('Issues found:');
      console.table(issues);
    } else {
      console.log('No issues found in reservations.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
