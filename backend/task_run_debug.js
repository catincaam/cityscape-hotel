import Reservation from './entities/Reservation.js';
import Client from './entities/Client.js';
import Invoice from './entities/Invoice.js';
import Payment from './entities/Payment.js';
import DB_Init from './entities/DB_Init.js';

async function run() {
  await DB_Init();
  
  const allReservations = await Reservation.findAll({
    include: [
      { model: Client },
      { 
        model: Invoice, 
        as: 'Invoice',
        include: [{ model: Payment, as: 'payments' }] 
      }
    ]
  });

  console.log('ALL_RESERVATIONS:', allReservations.length);
  allReservations.forEach(r => {
    const totalAmount = r.Invoice ? parseFloat(r.Invoice.totalAmount) : 0;
    const payments = r.Invoice && r.Invoice.payments ? r.Invoice.payments : [];
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    console.log(JSON.stringify({
      id: r.ReservationId,
      status: r.status,
      total: totalAmount,
      paid: totalPaid,
      twentyPercent: totalAmount * 0.2
    }));
  });
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
