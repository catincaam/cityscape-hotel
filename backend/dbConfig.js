
// Încărcare .env la prima linie pentru orice context
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(".env") });

import Sequelize from "sequelize";

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
