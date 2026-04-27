import Reservation from './entities/Reservation.js';
import Client from './entities/Client.js';
import Invoice from './entities/Invoice.js';
import Payment from './entities/Payment.js';
import DB_Init from './entities/DB_Init.js';

async function run() {
  await DB_Init();
  
  const reservations = await Reservation.findAll({
    where: { status: 'active' },
    include: [
      { model: Client },
      { 
        model: Invoice, 
        as: 'Invoice',
        include: [{ model: Payment, as: 'payments' }] 
      }
    ]
  });

  const filtered = reservations.filter(r => {
    const totalAmount = r.Invoice ? parseFloat(r.Invoice.totalAmount) : 0;
    const payments = r.Invoice && r.Invoice.payments ? r.Invoice.payments : [];
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    return totalAmount > 0 && totalPaid >= 0.2 * totalAmount;
  });

  console.log('RESULTS_START');
  filtered.forEach(r => {
    const totalAmount = r.Invoice ? parseFloat(r.Invoice.totalAmount) : 0;
    const payments = r.Invoice && r.Invoice.payments ? r.Invoice.payments : [];
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    console.log(JSON.stringify({
      ReservationId: r.ReservationId,
      status: r.status,
      totalPrice: totalAmount,
      totalPaid: totalPaid,
      guestName: r.Client ? r.Client.FirstName + ' ' + r.Client.LastName : 'N/A',
      checkin: r.requestedCheckin,
      checkout: r.requestedCheckout
    }));
  });
  console.log('RESULTS_END');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
