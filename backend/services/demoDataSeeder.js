import bcrypt from "bcrypt";
import { Op } from "sequelize";
import db from "../dbConfig.js";
import Client from "../entities/Client.js";
import Hotel from "../entities/Hotel.js";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
import RoomImage from "../entities/RoomImage.js";
import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";
import Invoice from "../entities/Invoice.js";
import Payment from "../entities/Payment.js";
import Service from "../entities/Service.js";
import ReservationService from "../entities/ReservationService.js";
import ConsumedService from "../entities/ConsumedService.js";
import Feedback from "../entities/Feedback.js";
import Reward from "../entities/Reward.js";
import RewardPoint from "../entities/RewardPoint.js";
import { ensureClientTypes } from "./clientTierService.js";

const DEMO_EMAIL_DOMAIN = "cityscape.local";

const addDays = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const getNights = (checkin, checkout) => {
  return Math.max(1, Math.round((checkout - checkin) / (1000 * 60 * 60 * 24)));
};

const toMoney = (value) => Math.round(Number(value) * 100) / 100;

const themeSeeds = [
  {
    city: "Shanghai",
    continent: "Asia",
    theme: "Modern Oriental Luxury",
    name: "Shanghai Skyline Room",
    basePrice: 120,
    maxGuests: 2,
    size: 34,
    bedType: "Queen bed",
    image: "https://images.unsplash.com/photo-1617103996702-96ff29b1c467?auto=format&fit=crop&w=1200&q=80",
    showcaseImage: "https://images.unsplash.com/photo-1506158669146-619067262a00?auto=format&fit=crop&w=1400&q=80",
    amenities: ["Free WiFi", "Air conditioning", "Smart TV", "Mini-bar", "Safe"],
    description: "A luxurious room inspired by Shanghai's skyline, blending modern comfort with elegant oriental accents."
  },
  {
    city: "Seoul",
    continent: "Asia",
    theme: "Korean Contemporary",
    name: "Seoul Harmony Room",
    basePrice: 100,
    maxGuests: 2,
    size: 30,
    bedType: "Queen bed",
    image: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    showcaseImage: "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1400&q=80",
    amenities: ["Free WiFi", "Air conditioning", "Smart TV", "Safe", "Mini-bar"],
    description: "A calm Korean-inspired room with warm lighting, natural textures, and balanced contemporary comfort."
  },
  {
    city: "Alberobello",
    continent: "Europe",
    theme: "Rustic Trulli Style",
    name: "Alberobello Trulli Room",
    basePrice: 120,
    maxGuests: 4,
    size: 42,
    bedType: "King bed",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
    showcaseImage: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1400&q=80",
    amenities: ["Free WiFi", "Air conditioning", "Breakfast included", "Safe"],
    description: "A charming rustic room inspired by Italian stone houses, soft arches, and authentic Mediterranean textures."
  },
  {
    city: "Lisbon",
    continent: "Europe",
    theme: "Vintage Portuguese",
    name: "Lisbon Heritage Room",
    basePrice: 125,
    maxGuests: 3,
    size: 35,
    bedType: "Queen bed",
    image: "https://images.unsplash.com/photo-1618221118493-9cfa1a1c00da?auto=format&fit=crop&w=1200&q=80",
    showcaseImage: "https://images.unsplash.com/photo-1500964757637-c85e8a162699?auto=format&fit=crop&w=1400&q=80",
    amenities: ["Free WiFi", "Air conditioning", "Smart TV", "Safe"],
    description: "A cozy room inspired by Lisbon's charm, featuring traditional azulejo accents and a warm palette."
  },
  {
    city: "Prague",
    continent: "Europe",
    theme: "Classic European",
    name: "Prague Royal Room",
    basePrice: 80,
    maxGuests: 2,
    size: 28,
    bedType: "Double bed",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
    showcaseImage: "https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1400&q=80",
    amenities: ["Free WiFi", "Air conditioning", "Smart TV", "Mini-bar", "Safe"],
    description: "An elegant room inspired by Prague's historic charm, soft classic decor, and refined atmosphere."
  },
  {
    city: "Cancun",
    continent: "North America",
    theme: "Tropical Resort",
    name: "Cancun Beach Suite",
    basePrice: 200,
    maxGuests: 4,
    size: 48,
    bedType: "King bed",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
    showcaseImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    amenities: ["Free WiFi", "Air conditioning", "Balcony / Terrace", "Smart TV", "Mini-bar"],
    description: "A relaxed tropical suite with breezy colors, natural light, and a seaside-inspired atmosphere."
  }
];

const serviceSeeds = [
  {
    name: "Private Cooking Class",
    category: "Experiences",
    price: 75,
    priceType: "per_person",
    description: "Learn to prepare authentic cuisine with our expert chef.",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Spa Massage",
    category: "Wellness & Spa",
    price: 95,
    priceType: "per_person",
    description: "A relaxing full-body massage designed for deep recovery.",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Airport Transfer",
    category: "Transport",
    price: 45,
    priceType: "per_booking",
    description: "Private transfer from or to the airport.",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Premium Breakfast",
    category: "Restaurant",
    price: 28,
    priceType: "per_person",
    description: "Daily breakfast with local ingredients and specialty coffee.",
    image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Pool Bar Access",
    category: "Wellness & Spa",
    price: 30,
    priceType: "per_booking",
    description: "Enjoy refreshing drinks and snacks at our pool bar.",
    image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "City Tours",
    category: "Experiences",
    price: 45,
    priceType: "per_person",
    description: "Guided tours to explore the city's main attractions.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
  }
];

const rewardSeeds = [
  {
    title: "Complimentary Dinner",
    desc: "Enjoy a curated dinner at our hotel restaurant.",
    points: 300,
    category: "Dining",
    rewardType: "per_person",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Spa Massage",
    desc: "Redeem points for a relaxing spa massage.",
    points: 250,
    category: "Wellness & Spa",
    rewardType: "per_person",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Airport Transfer",
    desc: "Complimentary transfer for your next stay.",
    points: 200,
    category: "Transport",
    rewardType: "per_booking",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Late Checkout",
    desc: "Extend your departure with a late checkout benefit.",
    points: 150,
    category: "Stay Benefits",
    rewardType: "per_booking",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
  }
];

const clientSeeds = [
  ["Catinca", "Marinescu", "Gold"],
  ["Elena", "Popescu", "Silver"],
  ["Julian", "Vane", "Standard"],
  ["Mihai", "Popescu", "Standard"],
  ["Ana", "Ionescu", "Silver"],
  ["Sofia", "Dumitru", "Standard"],
  ["Matei", "Georgescu", "Gold"],
  ["Irina", "Stan", "Standard"]
].map(([FirstName, LastName, TypeClientTip], index) => ({
  FirstName,
  LastName,
  TypeClientTip,
  Email: `demo.${index + 1}.${FirstName.toLowerCase()}.${LastName.toLowerCase()}@${DEMO_EMAIL_DOMAIN}`
}));

async function removePreviousDemoData(transaction) {
  const demoClients = await Client.findAll({
    where: { Email: { [Op.like]: `demo.%@${DEMO_EMAIL_DOMAIN}` } },
    attributes: ["ClientId"],
    transaction
  });

  const clientIds = demoClients.map((client) => client.ClientId);
  if (!clientIds.length) return;

  const reservations = await Reservation.findAll({
    where: { ClientId: { [Op.in]: clientIds } },
    attributes: ["ReservationId"],
    transaction
  });
  const reservationIds = reservations.map((reservation) => reservation.ReservationId);

  const invoices = reservationIds.length
    ? await Invoice.findAll({
        where: { ReservationId: { [Op.in]: reservationIds } },
        attributes: ["InvoiceId"],
        transaction
      })
    : [];
  const invoiceIds = invoices.map((invoice) => invoice.InvoiceId);

  if (invoiceIds.length) {
    await ConsumedService.destroy({ where: { InvoiceId: { [Op.in]: invoiceIds } }, transaction });
    await Payment.destroy({ where: { InvoiceId: { [Op.in]: invoiceIds } }, transaction });
    await Invoice.destroy({ where: { InvoiceId: { [Op.in]: invoiceIds } }, transaction });
  }

  if (reservationIds.length) {
    await Feedback.destroy({ where: { ReservationId: { [Op.in]: reservationIds } }, transaction });
    await ReservationService.destroy({ where: { ReservationId: { [Op.in]: reservationIds } }, transaction });
    await RoomReservation.destroy({ where: { ReservationId: { [Op.in]: reservationIds } }, transaction });
    await RewardPoint.destroy({ where: { ReservationId: { [Op.in]: reservationIds } }, transaction });
    await Reservation.destroy({ where: { ReservationId: { [Op.in]: reservationIds } }, transaction });
  }

  await RewardPoint.destroy({ where: { UserId: { [Op.in]: clientIds } }, transaction });
  await Client.destroy({ where: { ClientId: { [Op.in]: clientIds } }, transaction });
}

async function upsertCatalog(transaction) {
  await ensureClientTypes();

  const [hotel] = await Hotel.findOrCreate({
    where: { name: "Cityscape Hotel" },
    defaults: { address: "1 Sanctuary Avenue, Cityscape" },
    transaction
  });

  const themes = [];
  for (const seed of themeSeeds) {
    const [theme] = await RoomTheme.findOrCreate({
      where: { name: seed.name },
      defaults: seed,
      transaction
    });
    await theme.update(seed, { transaction });
    themes.push(theme);

    const existingImages = await RoomImage.count({ where: { RoomThemeId: theme.RoomThemeId }, transaction });
    if (existingImages === 0) {
      await RoomImage.bulkCreate([
        { RoomThemeId: theme.RoomThemeId, imageUrl: seed.image, isPrimary: true, orderIndex: 1 },
        { RoomThemeId: theme.RoomThemeId, imageUrl: seed.showcaseImage, isPrimary: false, orderIndex: 2 }
      ], { transaction });
    }

    const roomCount = await Room.count({ where: { HotelId: hotel.HotelId, RoomThemeId: theme.RoomThemeId }, transaction });
    for (let index = roomCount; index < 3; index += 1) {
      await Room.create({
        HotelId: hotel.HotelId,
        RoomThemeId: theme.RoomThemeId,
        floor: index + 1,
        status: "available"
      }, { transaction });
    }
  }

  const services = [];
  for (const seed of serviceSeeds) {
    const [service] = await Service.findOrCreate({
      where: { name: seed.name },
      defaults: {
        ...seed,
        status: "activ",
        bookableOnline: true,
        availableForExternalGuests: false
      },
      transaction
    });
    await service.update({
      ...seed,
      status: "activ",
      bookableOnline: true,
      availableForExternalGuests: false
    }, { transaction });
    services.push(service);
  }

  const rewards = [];
  for (const seed of rewardSeeds) {
    const [reward] = await Reward.findOrCreate({
      where: { title: seed.title },
      defaults: { ...seed, active: true },
      transaction
    });
    await reward.update({ ...seed, active: true }, { transaction });
    rewards.push(reward);
  }

  const rooms = await Room.findAll({
    include: [{ model: RoomTheme }],
    order: [["RoomId", "ASC"]],
    transaction
  });

  return { hotel, themes, rooms, services, rewards };
}

async function createDemoClients(transaction) {
  const password = await bcrypt.hash("Demo1234", 10);

  return Promise.all(
    clientSeeds.map((seed) =>
      Client.create({
        ...seed,
        Password: password,
        profilePicture: "https://img.freepik.com/premium-vector/cute-frog-explorer-boy-vector-illustration_456699-1187.jpg?w=740"
      }, { transaction })
    )
  );
}

async function createReservationBundle({ client, room, serviceSet, reservationSeed, transaction }) {
  const checkin = addDays(reservationSeed.startOffset);
  const checkout = addDays(reservationSeed.endOffset);
  const nights = getNights(checkin, checkout);
  const roomPrice = toMoney(Number(room.RoomTheme?.basePrice || 100) * nights);
  const selectedServices = reservationSeed.services.map((serviceIndex) => serviceSet[serviceIndex]).filter(Boolean);
  const serviceTotal = selectedServices.reduce((sum, service) => {
    const quantity = service.priceType === "per_person" ? reservationSeed.guests : 1;
    return sum + Number(service.price || 0) * quantity;
  }, 0);
  const totalAmount = toMoney(roomPrice + serviceTotal);
  const paidAmount = reservationSeed.paymentRatio >= 1
    ? totalAmount
    : toMoney(totalAmount * reservationSeed.paymentRatio);

  const reservation = await Reservation.create({
    reservationDate: addDays(reservationSeed.createdOffset || -20),
    requestedCheckin: checkin,
    requestedCheckout: checkout,
    bookingMethod: "demo-seed",
    nrPeople: reservationSeed.guests,
    ClientId: client.ClientId,
    status: reservationSeed.status
  }, { transaction });

  await RoomReservation.create({
    ReservationId: reservation.ReservationId,
    RoomId: room.RoomId
  }, { transaction });

  const invoice = await Invoice.create({
    issueDate: addDays(reservationSeed.createdOffset || -20),
    totalAmount,
    status: paidAmount >= totalAmount ? "paid" : "partial",
    ReservationId: reservation.ReservationId
  }, { transaction });

  if (paidAmount > 0) {
    await Payment.create({
      amount: paidAmount,
      paymentDate: addDays(reservationSeed.createdOffset || -20),
      InvoiceId: invoice.InvoiceId,
      paymentType: paidAmount >= totalAmount ? "full" : "deposit"
    }, { transaction });
  }

  for (const service of selectedServices) {
    const quantity = service.priceType === "per_person" ? reservationSeed.guests : 1;
    const personDetails = service.priceType === "per_person"
      ? Array.from({ length: quantity }, (_, index) => ({
          name: `${client.FirstName} Guest ${index + 1}`,
          email: client.Email
        }))
      : null;

    await ReservationService.create({
      ReservationId: reservation.ReservationId,
      ServiceId: service.ServiceId,
      quantity,
      unitPrice: Number(service.price || 0),
      personDetails
    }, { transaction });

    if (reservationSeed.status === "completed") {
      await ConsumedService.create({
        InvoiceId: invoice.InvoiceId,
        ServiceId: service.ServiceId,
        quantity,
        paidPrice: Number(service.price || 0),
        personDetails
      }, { transaction });
    }
  }

  if (reservationSeed.feedback) {
    await Feedback.create({
      ...reservationSeed.feedback,
      submissionDate: addDays(reservationSeed.endOffset + 1),
      ClientId: client.ClientId,
      ReservationId: reservation.ReservationId
    }, { transaction });
  }

  await RewardPoint.create({
    UserId: client.ClientId,
    ReservationId: reservation.ReservationId,
    amount: reservationSeed.status === "completed" ? 500 : 250,
    status: reservationSeed.status === "completed" ? "active" : "pending",
    description: reservationSeed.status === "completed"
      ? `Demo points for completed stay #${reservation.ReservationId}`
      : `Pending demo points for reservation #${reservation.ReservationId}`,
    availableAt: reservationSeed.status === "completed" ? addDays(-1) : checkout
  }, { transaction });

  return reservation;
}

export async function seedDemoData() {
  return db.transaction(async (transaction) => {
    await removePreviousDemoData(transaction);
    const catalog = await upsertCatalog(transaction);
    const clients = await createDemoClients(transaction);

    const reservationSeeds = [
      { startOffset: -36, endOffset: -32, createdOffset: -50, guests: 2, status: "completed", paymentRatio: 1, services: [0, 3], feedback: { overall: 5, cleanliness: 5, service: 5, theme: 5, comment: "Amazing experience, I will return again." } },
      { startOffset: -18, endOffset: -14, createdOffset: -30, guests: 2, status: "completed", paymentRatio: 1, services: [1], feedback: { overall: 4, cleanliness: 4, service: 5, theme: 4, comment: "Beautiful room and very attentive service." } },
      { startOffset: -8, endOffset: -2, createdOffset: -20, guests: 3, status: "completed", paymentRatio: 1, services: [2, 5], feedback: { overall: 4, cleanliness: 3, service: 4, theme: 5, comment: "Good price, but the cleaning could be improved." } },
      { startOffset: -1, endOffset: 4, createdOffset: -10, guests: 2, status: "paid", paymentRatio: 1, services: [3] },
      { startOffset: 3, endOffset: 7, createdOffset: -5, guests: 2, status: "partial", paymentRatio: 0.2, services: [2] },
      { startOffset: 8, endOffset: 12, createdOffset: -4, guests: 4, status: "paid", paymentRatio: 1, services: [0, 4] },
      { startOffset: 16, endOffset: 20, createdOffset: -3, guests: 2, status: "paid", paymentRatio: 1, services: [1, 3] },
      { startOffset: 22, endOffset: 26, createdOffset: -2, guests: 2, status: "partial", paymentRatio: 0.2, services: [5] },
      { startOffset: 32, endOffset: 35, createdOffset: -1, guests: 1, status: "cancelled", paymentRatio: 0.2, services: [] },
      { startOffset: -60, endOffset: -55, createdOffset: -75, guests: 2, status: "completed", paymentRatio: 1, services: [3, 4], feedback: { overall: 5, cleanliness: 5, service: 4, theme: 5, comment: "Luxury experience absolutely worth it." } },
      { startOffset: -48, endOffset: -44, createdOffset: -65, guests: 2, status: "completed", paymentRatio: 1, services: [2], feedback: { overall: 4, cleanliness: 4, service: 4, theme: 4, comment: "Smooth reservation flow and a memorable stay." } },
      { startOffset: 40, endOffset: 45, createdOffset: -1, guests: 3, status: "paid", paymentRatio: 1, services: [0, 1] }
    ];

    const reservations = [];
    for (let index = 0; index < reservationSeeds.length; index += 1) {
      const seed = reservationSeeds[index];
      const client = clients[index % clients.length];
      const room = catalog.rooms[index % catalog.rooms.length];
      const reservation = await createReservationBundle({
        client,
        room,
        serviceSet: catalog.services,
        reservationSeed: seed,
        transaction
      });
      reservations.push(reservation);
    }

    await RewardPoint.bulkCreate([
      {
        UserId: clients[0].ClientId,
        ReservationId: null,
        amount: -300,
        status: "redeemed",
        description: "Redeemed demo reward: Complimentary Dinner",
        availableAt: addDays(-3)
      },
      {
        UserId: clients[1].ClientId,
        ReservationId: null,
        amount: 750,
        status: "active",
        description: "Welcome loyalty bonus",
        availableAt: addDays(-1)
      }
    ], { transaction });

    return {
      clients: clients.length,
      rooms: catalog.rooms.length,
      services: catalog.services.length,
      rewards: catalog.rewards.length,
      reservations: reservations.length
    };
  });
}
