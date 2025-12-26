import db from "./dbConfig.js";
import bcrypt from "bcrypt";

// Entități
import Client from "./entities/Client.js";
import ClientType from "./entities/ClientType.js";
import Hotel from "./entities/Hotel.js";
import Room from "./entities/Room.js";
import RoomTheme from "./entities/RoomTheme.js";
import Reservation from "./entities/Reservation.js";
import Invoice from "./entities/Invoice.js";
import DB_Init from "./entities/DB_Init.js";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Inițializează baza de date (fără force: true)
    await DB_Init();

    // Doar sincronizează schema fără să șteargă datele
    await db.sync({ alter: true });
    console.log("✅ Database schema synced");

    // 1. Creează tipuri de clienți (doar dacă nu există)
    let standardType = await ClientType.findOne({ where: { tip: "Standard" } });
    let premiumType = await ClientType.findOne({ where: { tip: "Premium" } });
    let vipType = await ClientType.findOne({ where: { tip: "VIP" } });

    if (!standardType) standardType = await ClientType.create({ tip: "Standard" });
    if (!premiumType) premiumType = await ClientType.create({ tip: "Premium" });
    if (!vipType) vipType = await ClientType.create({ tip: "VIP" });
    console.log("✅ Client types ready");

    // 2. Creează cont de admin (doar dacă nu există)
    const adminExists = await Client.findOne({ where: { Email: "admin@cityscape.com" } });
    if (!adminExists) {
      const adminPassword = await bcrypt.hash("admin123", 10);
      await Client.create({
        FirstName: "Admin",
        LastName: "Hotel",
        Email: "admin@cityscape.com",
        Password: adminPassword,
        TypeClientTip: vipType.tip
      });
      console.log("✅ Admin account created (email: admin@cityscape.com, password: admin123)");
    } else {
      console.log("✅ Admin account already exists");
    }

    // 3. Creează hoteluri (doar dacă nu există)
    let hotel1 = await Hotel.findOne({ where: { name: "Grand Hotel Palace" } });
    let hotel2 = await Hotel.findOne({ where: { name: "Sunset Beach Resort" } });

    if (!hotel1) {
      hotel1 = await Hotel.create({
        name: "Grand Hotel Palace",
        address: "Str. Victoriei 123, București"
      });
    }

    if (!hotel2) {
      hotel2 = await Hotel.create({
        name: "Sunset Beach Resort",
        address: "Bd. Mamaia 456, Constanța"
      });
    }
    console.log("✅ Hotels ready");

    // 4. Teme de camere - doar cele create de admin
    // (temele hardcodate au fost eliminate - adminul le va crea prin panel)
    console.log("✅ Room themes ready (to be created by admin)");

    // 5. Camere - fără camere hardcodate deocamdată
    console.log("✅ Rooms ready (to be created by admin)");

    // 6-7. Rezervări și facturi vor fi create după ce adminul adaugă camere
    console.log("✅ Reservations ready (to be created after rooms exist)");

    console.log("\n🎉 Database seeding complete!");
    console.log("\n� Admin account:");
    console.log("   Email: admin@cityscape.com");
    console.log("   Password: admin123");
    console.log("\n💡 Adminul trebuie să creeze teme și camere prin Admin Panel!");
    console.log("💡 Clienții se pot înregistra prin pagina de login!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
