import DB_Init from "./entities/DB_Init.js";
import db from "./dbConfig.js";
import { seedDemoData } from "./services/demoDataSeeder.js";

try {
  await DB_Init();
  const summary = await seedDemoData();
  console.log("Demo data seeded successfully:", summary);
} catch (error) {
  console.error("Demo data seed failed:", error);
  process.exitCode = 1;
} finally {
  await db.close();
}
