import db from "./dbConfig.js";
import Reward from "./entities/Reward.js";

(async () => {
  try {
    await db.authenticate();
    
    // 1. Raw SQL query
    console.log("🔍 Raw SQL query:");
    const raw = await db.query(`SELECT * FROM Rewards LIMIT 1`);
    console.log("Result:", JSON.stringify(raw[0][0], null, 2));
    
    // 2. Sequelize findOne
    console.log("\n🔍 Sequelize findOne:");
    const seq = await Reward.findOne();
    console.log("Result:", JSON.stringify(seq.toJSON(), null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Eroare:", err.message);
    process.exit(1);
  }
})();
