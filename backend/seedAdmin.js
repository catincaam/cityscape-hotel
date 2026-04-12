import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(".env") });
import Admin from "./entities/Admin.js";
import bcrypt from "bcrypt";

export async function seedAdmin() {
  const exists = await Admin.findOne({ where: { email: "admin@cityscape.com" } });
  if (!exists) {
    await Admin.create({
      email: "admin@cityscape.com",
      password: await bcrypt.hash("admin123", 10),
      name: "Marinescu Catinca"
    });
    console.log("Admin user created: admin@cityscape.com / admin123");
  } else {
    console.log("Admin user already exists");
  }
}
