
import Reservation from "./entities/Reservation.js";
import Invoice from "./entities/Invoice.js";
import Payment from "./entities/Payment.js";
import db from "./dbConfig.js";
import DB_Init from "./entities/DB_Init.js";

async function runQuery() {
  try {
    await db.authenticate();
    // Use the associations setup from DB_Init
    const { Reward } = await import("./entities/DB_Init.js");
    const { default: init } = await import("./entities/DB_Init.js"); 
    // Actually the index imports DB_Init and runs it
    // Let us manually handle the query by ensuring associations are loaded.
    // For simplicity, let"s use raw query if model include fails, 
    // but try the structured way first.

    const reservations = await Reservation.findAll({
      where: {
        status: "completed",
        isCancelled: false
      },
      include: [
        {
          model: Invoice,
          include: [
            {
              model: Payment,
              as: "payments"
            }
          ]
        }
      ]
    });

    let totalSum = 0;
    reservations.forEach(r => {
      const invoice = r.Invoice;
      if (invoice) {
        const totalPrice = parseFloat(invoice.totalPrice) || 0;
        const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        if (totalPaid >= totalPrice) {
          totalSum += totalPaid;
          console.log(`Reservation ID: ${r.Id}, Total Price: ${totalPrice}, Total Paid: ${totalPaid}`);
        }
      }
    });

    console.log(`Total Sum of totalPaid: ${totalSum}`);
    if (totalSum >= 4500) {
      console.log("Result: The sum is >= 4.5k.");
    } else {
      console.log("Result: The sum is < 4.5k.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

runQuery();

