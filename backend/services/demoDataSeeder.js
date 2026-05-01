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
    const catalog = await loadExistingCatalog(transaction);
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
      reservations: reservations.length
    };
  });
}
