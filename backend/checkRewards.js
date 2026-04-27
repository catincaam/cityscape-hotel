import db from "./dbConfig.js";

(async () => {
  try {
    await db.authenticate();
    
    // Check table structure
    const result = await db.query(`DESCRIBE Rewards;`);
    console.log("📊 Rewards table structure:");
    console.log(result[0]);
    
    // Check actual data
    const data = await db.query(`SELECT RewardId, title, reward_type FROM Rewards LIMIT 3;`);
    console.log("\n📋 Sample rewards:");
    console.log(data[0]);
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Eroare:", err.message);
    process.exit(1);
  }
})();
