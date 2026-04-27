import { Sequelize } from "sequelize";
import db from "./dbConfig.js";

// Migrare rapidă pentru adăugare personDetails la ConsumedService
async function migrate() {
  try {
    await db.query(`ALTER TABLE ConsumedService ADD COLUMN personDetails JSON NULL COMMENT 'Array cu persoane pentru serviciile per_person'`);
    console.log("✅ personDetails adăugat în ConsumedService");
    process.exit(0);
  } catch (e) {
    if (e.message.includes('Duplicate column name')) {
      console.log("(Deja există personDetails)");
      process.exit(0);
    }
    console.error(e);
    process.exit(1);
  }
}

migrate();
