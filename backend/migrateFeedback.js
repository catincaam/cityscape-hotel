import db from "./dbConfig.js";

async function migrateFeedback() {
  try {
    console.log("Migrating Feedback table...");
    
    // Drop old table
    await db.query('DROP TABLE IF EXISTS `Feedback`');
    console.log("✓ Old table dropped");
    
    // Create new table with correct schema
    await db.query(`
      CREATE TABLE \`Feedback\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`overall\` INT,
        \`cleanliness\` INT,
        \`service\` INT,
        \`theme\` INT,
        \`comment\` VARCHAR(1000),
        \`submissionDate\` DATETIME NOT NULL,
        \`ClientId\` INT NOT NULL,
        \`ReservationId\` INT NOT NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        FOREIGN KEY (\`ClientId\`) REFERENCES \`Client\`(\`ClientId\`),
        FOREIGN KEY (\`ReservationId\`) REFERENCES \`reservation\`(\`ReservationId\`)
      )
    `);
    console.log("✓ New table created with correct schema");
    
    console.log("✓ Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(1);
  }
}

migrateFeedback();
