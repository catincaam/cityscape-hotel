import fs from "fs/promises";
import path from "path";
import DB_Init from "./entities/DB_Init.js";
import db from "./dbConfig.js";
import { exportCatalogData } from "./services/catalogTransferService.js";

const outputPath = path.resolve("catalog-export.json");

try {
  await DB_Init();
  const catalog = await exportCatalogData();
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2), "utf8");
  console.log(`Catalog exported to ${outputPath}`);
} catch (error) {
  console.error("Catalog export failed:", error);
  process.exitCode = 1;
} finally {
  await db.close();
}
