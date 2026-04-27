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

  console.log('--- Database Query Results (Targeted Filter) ---');
  const manualFiltered = allReservations.filter(r => {
    const totalAmount = r.Invoice ? parseFloat(r.Invoice.totalAmount) : 0;
    const payments = (r.Invoice && r.Invoice.payments) ? r.Invoice.payments : [];
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const isAtLeast20Percent = totalAmount > 0 ? (totalPaid >= 0.2 * totalAmount) : false;
    return r.status === 'active' && totalAmount > 0 && isAtLeast20Percent;
  });

  if (manualFiltered.length === 0) {
    console.log('No reservations found matching the criteria (status: active, total price > 0, total paid >= 20%).');
  } else {
    manualFiltered.forEach(r => {
      const totalAmount = r.Invoice ? parseFloat(r.Invoice.totalAmount) : 0;
      const payments = (r.Invoice && r.Invoice.payments) ? r.Invoice.payments : [];
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const guestName = r.Client ? (r.Client.FirstName + ' ' + r.Client.LastName) : 'N/A';
      console.log(ReservationId: \, Status: \, Total: \, Paid: \, Guest: \, Checkin: \, Checkout: \);
    });
  }

  console.log('\n--- Backend API Analysis (/api/booking/admin/bookings) ---');
  console.log(Backend API /admin/bookings returns \ total records.);
  console.log('Code structure in BookingRouter.js shows that the API returns ALL reservations without the "status=active", "price > 0", or "paid >= 20%" filters.');
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
