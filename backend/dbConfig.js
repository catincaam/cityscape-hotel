
// Încărcare .env la prima linie pentru orice context
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(".env") });

import Sequelize from "sequelize";

// DEBUG: Logare variabile de mediu pentru DB
console.log("[DEBUG] DB_USERNAME:", process.env.DB_USERNAME);
console.log("[DEBUG] DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("[DEBUG] DB_DATABASE:", process.env.DB_DATABASE);
console.log("[DEBUG] DB_HOST:", process.env.DB_HOST);
console.log("[DEBUG] DB_DIALECT:", process.env.DB_DIALECT);
console.log("[DEBUG] process.env snapshot:", JSON.stringify({
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_HOST: process.env.DB_HOST,
  DB_DIALECT: process.env.DB_DIALECT,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET
}, null, 2));

const db = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
    define: {
      freezeTableName: true
    }
  }
);

export default db;  // <-- adaugă asta
