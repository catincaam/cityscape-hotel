import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(".env") });

import db from "./dbConfig.js";

async function checkDatabase() {
  try {
    console.log("Connecting to database...\n");
    await db.authenticate();
    console.log("Database connected successfully!\n");

    // First, check what tables exist
    console.log("=== LIST OF TABLES ===");
    const tables = await db.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()",
      { raw: true }
    );
    console.log("Tables in database:");
    tables[0].forEach(t => console.log("  -", t.TABLE_NAME));
    console.log();

    // Query 1: Count all active RewardPoint entries
    console.log("=== QUERY 1: Count active RewardPoints ===");
    const countActive = await db.query(
      "SELECT COUNT(*) as count FROM rewardpoint WHERE status = 'active'",
      { raw: true }
    );
    console.log("Active RewardPoints count:", countActive[0][0].count);
    console.log();

    // Query 2: Show all active reward points with details
    console.log("=== QUERY 2: All active RewardPoints ===");
    const activeRewards = await db.query(
      "SELECT * FROM rewardpoint WHERE status = 'active'",
      { raw: true }
    );
    console.log("Active RewardPoints:");
    console.table(activeRewards[0]);
    console.log();

    // Query 3: Count all Reservations
    console.log("=== QUERY 3: Count all Reservations ===");
    const countReservations = await db.query(
      "SELECT COUNT(*) as count FROM reservation",
      { raw: true }
    );
    console.log("Total Reservations count:", countReservations[0][0].count);
    console.log();

    // Query 4: Count all Invoices
    console.log("=== QUERY 4: Count all Invoices ===");
    const countInvoices = await db.query(
      "SELECT COUNT(*) as count FROM invoice",
      { raw: true }
    );
    console.log("Total Invoices count:", countInvoices[0][0].count);
    console.log();

    // Additional info: Show associated client info for orphaned reward points
    if (activeRewards[0].length > 0) {
      console.log("=== BONUS: Column info for client table ===");
      const clientColumns = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'client'`,
        { raw: true }
      );
      console.log("Client table columns:");
      clientColumns[0].forEach(col => console.log("  -", col.COLUMN_NAME));
      console.log();

      console.log("=== BONUS: RewardPoints with Client Info ===");
      const rewardsWithClients = await db.query(
        `SELECT rp.*, c.firstName, c.lastName, c.email 
         FROM rewardpoint rp 
         LEFT JOIN client c ON rp.UserId = c.clientId 
         WHERE rp.status = 'active'`,
        { raw: true }
      );
      console.table(rewardsWithClients[0]);
    }

    await db.close();
    console.log("\nDatabase connection closed.");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkDatabase();
