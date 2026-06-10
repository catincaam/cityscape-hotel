import express from "express";
import authClient from "../middleware/authMiddleware.js";
import { getClientById } from "../dataAccess/ClientDA.js";
import { getInvoiceByReservationId } from "../dataAccess/InvoiceDA.js";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
import RoomImage from "../entities/RoomImage.js";
import RoomReservation from "../entities/RoomReservation.js";
import Reservation from "../entities/Reservation.js";
import { syncClientTier } from "../services/clientTierService.js";
import { syncReservationStatuses } from "../services/reservationStatusService.js";
import { publicAssetUrl } from "../utils/publicUrl.js";

const router = express.Router();

const toMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const getThemeImage = async (roomTheme) => {
  if (!roomTheme) return null;
  const roomThemeId = roomTheme.RoomThemeId || roomTheme.dataValues?.RoomThemeId;

  if (!roomThemeId) {
    return roomTheme.image || roomTheme.showcaseImage || null;
  }

  const galleryImage = await RoomImage.findOne({
    where: { RoomThemeId: roomThemeId },
    order: [["isPrimary", "DESC"], ["orderIndex", "ASC"], ["RoomImageId", "ASC"]]
  });

  return galleryImage?.imageUrl || roomTheme.image || roomTheme.showcaseImage || null;
};

const getReservationNights = (reservation) => {
  const checkin = new Date(reservation.requestedCheckin);
  const checkout = new Date(reservation.requestedCheckout);
  if (Number.isNaN(checkin.getTime()) || Number.isNaN(checkout.getTime())) return 1;
  return Math.max(1, Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24)));
};

const getReservationTotal = (reservation, roomTheme, invoice) => {
  const invoiceTotal = Number(invoice?.totalAmount || 0);
  if (invoiceTotal > 0) return toMoney(invoiceTotal);

  const nightlyRate = Number(roomTheme?.basePrice || 0);
  if (nightlyRate <= 0) return 0;

  return toMoney(nightlyRate * getReservationNights(reservation));
};

router.get("/dashboard", authClient, async (req, res) => {
  try {
    // 🔑 ID vine din JWT
    const clientId = req.client.id || req.client.ClientId || req.client.clientId;
    if (!clientId) {
      return res.status(401).json({ message: "Invalid client token" });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const clientTier = await syncClientTier(clientId);
    await client.reload();
    const { Password, ...safeClient } = client.dataValues;

    // Găsește rezervările utilizatorului
    const allReservations = await Reservation.findAll({
      where: { ClientId: clientId },
      include: [
        {
          model: RoomReservation,
          include: [
            {
              model: Room,
              include: [
                {
                  model: RoomTheme,
                  attributes: ['RoomThemeId', 'city', 'name', 'theme', 'image', 'showcaseImage', 'basePrice']
                }
              ]
            }
          ]
        }
      ],
      order: [['requestedCheckin', 'DESC']]
    });
    await syncReservationStatuses(allReservations);

    // Găsește următoarea rezervare (viitoare)
    const now = new Date();
    const upcomingReservations = allReservations.filter((reservation) => {
      const status = String(reservation.status || "").toLowerCase();
      return !["cancelled", "canceled", "pending"].includes(status)
        && new Date(reservation.requestedCheckin) >= now;
    });
    // Sortează crescător după check-in (cea mai apropiată prima)
    upcomingReservations.sort((a, b) => new Date(a.requestedCheckin) - new Date(b.requestedCheckin));
    const nextReservation = upcomingReservations.length > 0 ? upcomingReservations[0] : null;

    let nextDestination = null;
    if (nextReservation && nextReservation.RoomReservations && nextReservation.RoomReservations.length > 0) {
      const room = nextReservation.RoomReservations[0]?.Room;
      const roomTheme = room?.RoomTheme;
      const destinationImage = await getThemeImage(roomTheme);
      nextDestination = {
        reservationId: nextReservation.ReservationId,
        city: roomTheme?.city || "City",
        room: roomTheme?.name || room?.name || "Room",
        checkIn: nextReservation.requestedCheckin,
        checkOut: nextReservation.requestedCheckout,
        guests: nextReservation.nrPeople || 1,
        image: publicAssetUrl(destinationImage)
      };
    }

    // Rezervări recente (ultimele 5, doar cele plătite complet)
    const recentReservations = await Promise.all(
      allReservations.slice(0, 10).map(async (reservation) => {
        const room = reservation.RoomReservations && reservation.RoomReservations.length > 0 ? reservation.RoomReservations[0].Room : null;
        const roomTheme = room?.RoomTheme;
        const invoice = await getInvoiceByReservationId(reservation.ReservationId);
        // Doar dacă factura este paid
        if (invoice?.status !== 'paid') {
          return null;
        }
        const checkInDate = new Date(reservation.requestedCheckin);
        const checkOutDate = new Date(reservation.requestedCheckout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(0, 0, 0, 0);
        let bookingStatus = 'past';
        if (checkInDate > today) {
          bookingStatus = 'upcoming';
        } else if (checkOutDate >= today) {
          bookingStatus = 'active';
        }
        return {
          reservationId: reservation.ReservationId,
          room: roomTheme?.name || "Unknown",
          city: roomTheme?.city || "City",
          checkIn: reservation.requestedCheckin,
          checkOut: reservation.requestedCheckout,
          status: bookingStatus,
          totalAmount: getReservationTotal(reservation, roomTheme, invoice),
          pricePerNight: Number(roomTheme?.basePrice || 0),
          image: publicAssetUrl(await getThemeImage(roomTheme))
        };
      })
    );

    // Filtrează null-urile (rezervările neplătite)
    const paidReservations = recentReservations.filter(r => r !== null).slice(0, 5);

    const collectionThemes = await RoomTheme.findAll({
      order: [["RoomThemeId", "ASC"]],
      limit: 6
    });

    const boutiqueCollections = await Promise.all(
      collectionThemes.map(async (roomTheme) => ({
        room: roomTheme.name || roomTheme.theme || "Signature Suite",
        city: roomTheme.city || "Cityscape",
        pricePerNight: Number(roomTheme.basePrice || 0),
        image: publicAssetUrl(await getThemeImage(roomTheme))
      }))
    );

    // Toate rezervările (pentru Profile page)
    const allReservationsFormatted = await Promise.all(
      allReservations.map(async (reservation) => {
        const room = reservation.RoomReservations && reservation.RoomReservations.length > 0 ? reservation.RoomReservations[0].Room : null;
        const roomTheme = room?.RoomTheme;
        const invoice = await getInvoiceByReservationId(reservation.ReservationId);
        return {
          reservationId: reservation.ReservationId,
          room: roomTheme?.name || "Unknown",
          city: roomTheme?.city || "City",
          checkIn: reservation.requestedCheckin,
          checkOut: reservation.requestedCheckout,
          guests: reservation.nrPeople || 1,
          status: reservation.status || "pending",
          totalAmount: getReservationTotal(reservation, roomTheme, invoice),
          pricePerNight: Number(roomTheme?.basePrice || 0),
          image: publicAssetUrl(await getThemeImage(roomTheme))
        };
      })
    );

    // Calculează punctele active pentru user
    let cityPoints = 0;
    try {
      const RewardPoint = (await import("../entities/RewardPoint.js")).default;
      const { Op } = await import("sequelize");
      // Activează automat punctele dacă e cazul
      await RewardPoint.update(
        { status: "active" },
        {
          where: {
            UserId: clientId,
            status: "pending",
            availableAt: { [Op.lte]: new Date() }
          }
        }
      );
      cityPoints = await RewardPoint.sum("amount", {
        where: { UserId: clientId, status: "active" }
      }) || 0;
    } catch (e) {
      console.error("Could not calculate cityPoints", e);
    }
    res.json({
      client: safeClient,
      clientTier,
      cityPoints,
      nextDestination,
      recentReservations: paidReservations,
      boutiqueCollections,
      allReservations: allReservationsFormatted
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
