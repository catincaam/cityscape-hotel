import dotenv from "dotenv";
import Sequelize from "sequelize";
import Reward from "./entities/Reward.js";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false,
  }
);

const SAMPLE_REWARDS = [
  {
    title: "Royal Suite Afternoon Tea",
    desc: "Complimentary afternoon tea service in our signature Royal Suite with premium pastries and champagne.",
    points: 4500,
    category: "Dining",
    rewardType: "per_booking",
    image: "/uploads/reward_tea.jpg",
    active: true
  },
  {
    title: "Spa Bliss Package",
    desc: "Full-day access to our luxurious spa including massage, facial, and wellness treatments.",
    points: 6000,
    category: "Wellness",
    rewardType: "per_person",
    image: "/uploads/reward_spa.jpg",
    active: true
  },
  {
    title: "Gourmet Dining Experience",
    desc: "Private chef dinner for two in your suite with wine pairing and personalized menu.",
    points: 8500,
    category: "Dining",
    rewardType: "per_booking",
    image: "/uploads/reward_dining.jpg",
    active: true
  },
  {
    title: "City Tour & Guide",
    desc: "Exclusive guided city tour with private car service and lunch at a local favorite.",
    points: 5500,
    category: "Activities",
    rewardType: "per_person",
    image: "/uploads/reward_tour.jpg",
    active: true
  },
  {
    title: "Premium Concierge",
    desc: "24-hour premium concierge service for event planning and special arrangements.",
    points: 3500,
    category: "Services",
    rewardType: "per_booking",
    image: "/uploads/reward_concierge.jpg",
    active: true
  },
  {
    title: "Wine Tasting Experience",
    desc: "Curated wine tasting session with sommelier in our private wine cellar.",
    points: 4000,
    category: "Experiences",
    rewardType: "per_person",
    image: "/uploads/reward_wine.jpg",
    active: true
  }
];

async function seedRewards() {
  try {
    console.log("🔄 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Connected!");

    console.log("🌱 Seeding rewards...");
    for (const rewardData of SAMPLE_REWARDS) {
      const existing = await Reward.findOne({ where: { title: rewardData.title } });
      
      if (!existing) {
        await Reward.create(rewardData);
        console.log(`✅ Added: ${rewardData.title}`);
      } else {
        console.log(`⏭️  Exists: ${rewardData.title}`);
      }
    }

    console.log("✨ Rewards seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedRewards();
