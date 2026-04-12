import db from './dbConfig.js';

async function checkPaymentStatus() {
  try {
    console.log('Checking payment status for all reservations...\n');

    // Query to get all reservations with their invoices and payments
    const [rows] = await db.query(`
      SELECT 
        r.ReservationId,
        i.totalAmount,
        COALESCE(SUM(p.amount), 0) as paidAmount,
        COUNT(p.id) as paymentCount
      FROM reservation r
      LEFT JOIN invoice i ON r.ReservationId = i.ReservationId
      LEFT JOIN payment p ON i.InvoiceId = p.InvoiceId
      GROUP BY r.ReservationId, i.InvoiceId, i.totalAmount
      ORDER BY r.ReservationId ASC
    `);

    console.log(`Found ${rows.length} reservations\n`);

    for (const row of rows) {
      const totalAmount = parseFloat(row.totalAmount) || 0;
      const paidAmount = parseFloat(row.paidAmount) || 0;
      const deposit = totalAmount * 0.2;
      const isFullPaid = paidAmount >= totalAmount;
      const isDepositPaid = paidAmount >= deposit;

      let status = 'Pending';
      if (isFullPaid) status = '✅ FULL PAID';
      else if (isDepositPaid) status = '⚠️ Deposit Paid';

      console.log(`Res ${row.ReservationId}:`);
      console.log(`  Total: $${totalAmount.toFixed(2)} | Paid: $${paidAmount.toFixed(2)} | Status: ${status}`);
      console.log(`  Payments: ${row.paymentCount}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkPaymentStatus();
