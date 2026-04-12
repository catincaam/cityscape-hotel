import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(".env") });

import db from "./dbConfig.js";
import Reservation from "./entities/Reservation.js";
import RoomReservation from "./entities/RoomReservation.js";
import Payment from "./entities/Payment.js";
import Invoice from "./entities/Invoice.js";
import ConsumedService from "./entities/ConsumedService.js";
import ReservationService from "./entities/ReservationService.js";
import Stay from "./entities/Stay.js";
import Feedback from "./entities/Feedback.js";

async function clearAllReservations() {
  try {
    console.log("🧹 Incepe stergerea tuturor rezervarilor...\n");

    // Helper function to safely delete
    const safeDelete = async (Model, name) => {
      try {
        const count = await Model.destroy({ where: {} });
        console.log(`✅ ${count} ${name} sterse`);
        return count;
      } catch (error) {
        console.log(`⏭️  ${name} - nu exista sau skip (${error.message.split('\n')[0]})`);
        return 0;
      }
    };

    // 1. Delete ConsumedServices
    await safeDelete(ConsumedService, "servicii consumate");

    // 2. Delete ReservationServices  
    await safeDelete(ReservationService, "servicii de rezervare");

    // 3. Delete Stays (optional - may not exist)
    try {
      await safeDelete(Stay, "sejururi");
    } catch (e) {}

    // 4. Delete Payments
    await safeDelete(Payment, "plati");

    // 5. Delete Invoices (CASCADE from Reservations)
    await safeDelete(Invoice, "facturi");

    // 6. Delete RoomReservations
    await safeDelete(RoomReservation, "inregistrari camera-rezervare");

    // 7. Delete Feedback (must be before Reservations!)
    await safeDelete(Feedback, "feedback-uri");

    // 8. Delete Reservations
    const deleted = await safeDelete(Reservation, "rezervari");

    console.log("\n✨ COMPLET! Toate rezervarile au fost sterse din baza de date!");

  } catch (error) {
    console.error("❌ EROARE la stergerea rezervarilor:", error.message);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

clearAllReservations();
