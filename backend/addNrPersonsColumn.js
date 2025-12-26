import db from "./dbConfig.js";

async function addColumn() {
  try {
    await db.query(`
      ALTER TABLE Reservation 
      ADD COLUMN nrPersons INT DEFAULT 1 AFTER bookingMethod
    `);
    console.log("✅ Column nrPersons added successfully!");
    process.exit(0);
  } catch (err) {
    if (err.original?.code === 'ER_DUP_FIELDNAME') {
      console.log("ℹ️ Column nrPersons already exists.");
      process.exit(0);
    }
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

addColumn();
