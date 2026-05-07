import bcrypt from "bcrypt";
import { Op } from "sequelize";
import db from "../dbConfig.js";
import Client from "../entities/Client.js";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";
import Invoice from "../entities/Invoice.js";
import Payment from "../entities/Payment.js";
import Service from "../entities/Service.js";
import ReservationService from "../entities/ReservationService.js";
import ConsumedService from "../entities/ConsumedService.js";
import Feedback from "../entities/Feedback.js";
import RewardPoint from "../entities/RewardPoint.js";
import { ensureClientTypes } from "./clientTierService.js";

const DEMO_EMAIL_DOMAIN = "cityscape.local";
const DEMO_TEST_EMAIL = "demo@cityscape.com";
const DEFAULT_PROFILE_PICTURE = "/assets/profilePicture.jpg";

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

const normalizeText = (value) => String(value || "").trim().toLowerCase();

function selectRoomByCity(rooms, city, fallbackIndex) {
  const normalizedCity = normalizeText(city);
  if (normalizedCity) {
    const matchingRooms = rooms.filter((room) => {
      const themeCity = normalizeText(room.RoomTheme?.city);
      return themeCity === normalizedCity || themeCity.includes(normalizedCity);
    });

    if (matchingRooms.length) {
      return matchingRooms[fallbackIndex % matchingRooms.length];
    }
  }

  return rooms[fallbackIndex % rooms.length];
}

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
  Email: index === 0
    ? DEMO_TEST_EMAIL
    : `demo.${index + 1}.${FirstName.toLowerCase()}.${LastName.toLowerCase()}@${DEMO_EMAIL_DOMAIN}`
}));

async function removePreviousDemoData(transaction) {
  const demoClients = await Client.findAll({
    where: {
      [Op.or]: [
        { Email: { [Op.like]: `demo.%@${DEMO_EMAIL_DOMAIN}` } },
        { Email: DEMO_TEST_EMAIL }
      ]
    },
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

async function loadExistingCatalog(transaction) {
  await ensureClientTypes();

  const [rooms, services] = await Promise.all([
    Room.findAll({
      include: [{ model: RoomTheme }],
      order: [["RoomId", "ASC"]],
      transaction
    }),
    Service.findAll({
      where: { status: { [Op.ne]: "inactive" } },
      order: [["ServiceId", "ASC"]],
      transaction
    })
  ]);

  if (!rooms.length) {
    throw new Error("No existing rooms found. Add rooms from admin before running the demo seed.");
  }

  if (!services.length) {
    throw new Error("No existing services found. Add services from admin before running the demo seed.");
  }

  return { rooms, services };
}

async function createDemoClients(transaction) {
  const password = await bcrypt.hash("Demo1234", 10);

  return Promise.all(
    clientSeeds.map((seed) =>
      Client.create({
        ...seed,
        Password: password,
        profilePicture: DEFAULT_PROFILE_PICTURE
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

function normalizeDemoReservationSeed(seed) {
  if (seed.endOffset < 0 && seed.status !== "cancelled") {
    return {
      ...seed,
      status: "completed",
      paymentRatio: 1
    };
  }

  return seed;
}

export async function seedDemoData() {
  return db.transaction(async (transaction) => {
    await removePreviousDemoData(transaction);
    const catalog = await loadExistingCatalog(transaction);
    const clients = await createDemoClients(transaction);

    const reservationSeeds = [
      { city: "Seoul", startOffset: -36, endOffset: -32, createdOffset: -50, guests: 2, status: "completed", paymentRatio: 1, services: [0, 3], feedback: { overall: 5, cleanliness: 5, service: 5, theme: 5, comment: "Amazing experience, I will return again." } },
      { city: "Shanghai", startOffset: -18, endOffset: -14, createdOffset: -30, guests: 2, status: "completed", paymentRatio: 1, services: [1], feedback: { overall: 4, cleanliness: 4, service: 5, theme: 4, comment: "Beautiful room and very attentive service." } },
      { city: "Alberobello", startOffset: -8, endOffset: -2, createdOffset: -20, guests: 3, status: "completed", paymentRatio: 1, services: [2, 5], feedback: { overall: 4, cleanliness: 3, service: 4, theme: 5, comment: "Good price, but the cleaning could be improved." } },
      { city: "Prague", startOffset: -6, endOffset: -3, createdOffset: -14, guests: 2, status: "completed", paymentRatio: 1, services: [0, 1, 4], feedback: { overall: 5, cleanliness: 5, service: 5, theme: 4, comment: "A very polished stay with excellent service and smooth communication." } },
      { city: "Lisbon", startOffset: -5, endOffset: -1, createdOffset: -12, guests: 4, status: "completed", paymentRatio: 1, services: [2, 3], feedback: { overall: 4, cleanliness: 4, service: 5, theme: 5, comment: "The room theme was memorable and the extra services were easy to add." } },
      { city: "Cancun", startOffset: -4, endOffset: -2, createdOffset: -10, guests: 2, status: "completed", paymentRatio: 1, services: [1, 5], feedback: { overall: 5, cleanliness: 5, service: 4, theme: 5, comment: "Great city-inspired atmosphere and a very comfortable short stay." } },
      { city: "Seoul", startOffset: -3, endOffset: -1, createdOffset: -8, guests: 1, status: "completed", paymentRatio: 1, services: [0, 2], feedback: { overall: 4, cleanliness: 5, service: 4, theme: 4, comment: "Everything was clear, fast, and well organized from booking to checkout." } },
      { city: "Shanghai", startOffset: -1, endOffset: 4, createdOffset: -10, guests: 2, status: "paid", paymentRatio: 1, services: [3] },
      { city: "Prague", startOffset: 1, endOffset: 5, createdOffset: -9, guests: 3, status: "partial", paymentRatio: 0.2, services: [0, 2] },
      { city: "Lisbon", startOffset: 2, endOffset: 6, createdOffset: -8, guests: 2, status: "paid", paymentRatio: 1, services: [1, 4] },
      { startOffset: 3, endOffset: 7, createdOffset: -5, guests: 2, status: "partial", paymentRatio: 0.2, services: [2] },
      { startOffset: 4, endOffset: 8, createdOffset: -6, guests: 4, status: "paid", paymentRatio: 1, services: [0, 3] },
      { startOffset: 5, endOffset: 9, createdOffset: -6, guests: 2, status: "paid", paymentRatio: 1, services: [5] },
      { startOffset: 8, endOffset: 12, createdOffset: -4, guests: 4, status: "paid", paymentRatio: 1, services: [0, 4] },
      { startOffset: 16, endOffset: 20, createdOffset: -3, guests: 2, status: "paid", paymentRatio: 1, services: [1, 3] },
      { startOffset: 22, endOffset: 26, createdOffset: -2, guests: 2, status: "partial", paymentRatio: 0.2, services: [5] },
      { startOffset: 32, endOffset: 35, createdOffset: -1, guests: 1, status: "cancelled", paymentRatio: 0.2, services: [] },
      { startOffset: -60, endOffset: -55, createdOffset: -75, guests: 2, status: "completed", paymentRatio: 1, services: [3, 4], feedback: { overall: 5, cleanliness: 5, service: 4, theme: 5, comment: "Luxury experience absolutely worth it." } },
      { startOffset: -48, endOffset: -44, createdOffset: -65, guests: 2, status: "completed", paymentRatio: 1, services: [2], feedback: { overall: 4, cleanliness: 4, service: 4, theme: 4, comment: "Smooth reservation flow and a memorable stay." } },
      { startOffset: 40, endOffset: 45, createdOffset: -1, guests: 3, status: "paid", paymentRatio: 1, services: [0, 1] },
      { startOffset: -72, endOffset: -68, createdOffset: -90, guests: 2, status: "completed", paymentRatio: 1, services: [1, 3], feedback: { overall: 5, cleanliness: 5, service: 5, theme: 4, comment: "Everything felt polished and personal." } },
      { startOffset: -28, endOffset: -24, createdOffset: -42, guests: 1, status: "completed", paymentRatio: 1, services: [4], feedback: { overall: 4, cleanliness: 4, service: 4, theme: 5, comment: "Lovely atmosphere and easy booking experience." } },
      { startOffset: 11, endOffset: 15, createdOffset: -4, guests: 2, status: "paid", paymentRatio: 1, services: [2] },
      { startOffset: 18, endOffset: 23, createdOffset: -3, guests: 3, status: "partial", paymentRatio: 0.2, services: [0] },
      { startOffset: 27, endOffset: 31, createdOffset: -2, guests: 2, status: "paid", paymentRatio: 1, services: [1, 4] },
      { startOffset: 36, endOffset: 39, createdOffset: -1, guests: 2, status: "cancelled", paymentRatio: 0.2, services: [] },
      { startOffset: -12, endOffset: -7, createdOffset: -25, guests: 4, status: "completed", paymentRatio: 1, services: [0, 2], feedback: { overall: 5, cleanliness: 4, service: 5, theme: 5, comment: "The themed room made the trip feel special." } },
      { startOffset: 48, endOffset: 53, createdOffset: -1, guests: 2, status: "paid", paymentRatio: 1, services: [3] },
      { startOffset: -95, endOffset: -91, createdOffset: -110, guests: 2, status: "completed", paymentRatio: 1, services: [0, 1], feedback: { overall: 5, cleanliness: 5, service: 5, theme: 5, comment: "The staff made everything feel effortless from arrival to checkout." } },
      { startOffset: -88, endOffset: -84, createdOffset: -103, guests: 3, status: "completed", paymentRatio: 1, services: [2], feedback: { overall: 4, cleanliness: 4, service: 5, theme: 4, comment: "Very smooth booking and a comfortable stay for our group." } },
      { startOffset: -82, endOffset: -79, createdOffset: -96, guests: 1, status: "completed", paymentRatio: 1, services: [3, 5], feedback: { overall: 5, cleanliness: 5, service: 5, theme: 4, comment: "I loved the quiet atmosphere and the thoughtful room details." } },
      { startOffset: -76, endOffset: -71, createdOffset: -90, guests: 2, status: "completed", paymentRatio: 1, services: [4], feedback: { overall: 4, cleanliness: 4, service: 4, theme: 5, comment: "The themed design was memorable and the service was reliable." } },
      { startOffset: -69, endOffset: -65, createdOffset: -84, guests: 4, status: "completed", paymentRatio: 1, services: [0, 2, 5], feedback: { overall: 5, cleanliness: 4, service: 5, theme: 5, comment: "Great for a family stay, especially with the extra services included." } },
      { startOffset: -54, endOffset: -50, createdOffset: -70, guests: 2, status: "completed", paymentRatio: 1, services: [1], feedback: { overall: 4, cleanliness: 5, service: 4, theme: 4, comment: "Clean room, fast support, and a very easy reservation process." } },
      { startOffset: -42, endOffset: -39, createdOffset: -58, guests: 2, status: "completed", paymentRatio: 1, services: [2, 3], feedback: { overall: 5, cleanliness: 5, service: 5, theme: 5, comment: "A polished experience with a room that matched the theme beautifully." } },
      { startOffset: -34, endOffset: -29, createdOffset: -48, guests: 3, status: "completed", paymentRatio: 1, services: [0], feedback: { overall: 4, cleanliness: 4, service: 4, theme: 5, comment: "The hotel felt personal and the city-inspired concept worked very well." } },
      { startOffset: -25, endOffset: -21, createdOffset: -38, guests: 2, status: "completed", paymentRatio: 1, services: [3, 4], feedback: { overall: 5, cleanliness: 5, service: 4, theme: 5, comment: "Beautiful visuals, comfortable room, and an overall premium stay." } },
      { startOffset: -17, endOffset: -13, createdOffset: -30, guests: 1, status: "completed", paymentRatio: 1, services: [5], feedback: { overall: 4, cleanliness: 4, service: 5, theme: 4, comment: "The team answered quickly and the room was exactly as described." } },
      { startOffset: -10, endOffset: -6, createdOffset: -24, guests: 2, status: "completed", paymentRatio: 1, services: [1, 2], feedback: { overall: 5, cleanliness: 5, service: 5, theme: 5, comment: "One of the nicest digital booking experiences I have used." } },
      { startOffset: 6, endOffset: 10, createdOffset: -5, guests: 3, status: "partial", paymentRatio: 0.2, services: [0, 4] },
      { startOffset: 7, endOffset: 11, createdOffset: -5, guests: 2, status: "paid", paymentRatio: 1, services: [2, 5] },
      { startOffset: 10, endOffset: 14, createdOffset: -4, guests: 2, status: "paid", paymentRatio: 1, services: [1] },
      { startOffset: 12, endOffset: 17, createdOffset: -3, guests: 4, status: "partial", paymentRatio: 0.2, services: [0, 3] },
      { startOffset: 14, endOffset: 18, createdOffset: -3, guests: 2, status: "paid", paymentRatio: 1, services: [4] },
      { startOffset: 20, endOffset: 24, createdOffset: -2, guests: 3, status: "paid", paymentRatio: 1, services: [2] },
      { startOffset: 25, endOffset: 29, createdOffset: -2, guests: 2, status: "partial", paymentRatio: 0.2, services: [1, 5] },
      { startOffset: 30, endOffset: 33, createdOffset: -1, guests: 1, status: "cancelled", paymentRatio: 0.2, services: [] },
      { startOffset: 42, endOffset: 46, createdOffset: -1, guests: 2, status: "paid", paymentRatio: 1, services: [0] },
      { startOffset: 55, endOffset: 59, createdOffset: -1, guests: 3, status: "paid", paymentRatio: 1, services: [3] }
    ];

    const reservations = [];
    for (let index = 0; index < reservationSeeds.length; index += 1) {
      const seed = normalizeDemoReservationSeed(reservationSeeds[index]);
      const client = index < 10
        ? clients[0]
        : clients[((index - 10) % (clients.length - 1)) + 1];
      const room = selectRoomByCity(catalog.rooms, seed.city, index);
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
      },
      {
        UserId: clients[2].ClientId,
        ReservationId: null,
        amount: -200,
        status: "redeemed",
        description: "Redeemed demo reward: Airport Transfer",
        availableAt: addDays(-8)
      },
      {
        UserId: clients[3].ClientId,
        ReservationId: null,
        amount: 500,
        status: "active",
        description: "Demo service loyalty bonus",
        availableAt: addDays(-2)
      },
      {
        UserId: clients[4].ClientId,
        ReservationId: null,
        amount: -250,
        status: "redeemed",
        description: "Redeemed demo reward: Spa Massage",
        availableAt: addDays(-12)
      },
      {
        UserId: clients[6].ClientId,
        ReservationId: null,
        amount: 1000,
        status: "active",
        description: "Gold tier demo bonus",
        availableAt: addDays(-1)
      }
    ], { transaction });

    return {
      clients: clients.length,
      rooms: catalog.rooms.length,
      services: catalog.services.length,
      reservations: reservations.length
    };
  });
}
