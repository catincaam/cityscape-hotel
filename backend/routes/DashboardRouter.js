import express from "express";
import authClient from "../middleware/authMiddleware.js";
import { getClientById } from "../dataAccess/ClientDA.js";
import { getReservations } from "../dataAccess/ReservationDA.js";
import { getInvoiceByReservationId } from "../dataAccess/InvoiceDA.js";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
import RoomReservation from "../entities/RoomReservation.js";
import Reservation from "../entities/Reservation.js";

const router = express.Router();

router.get("/dashboard", authClient, async (req, res) => {
  try {
    // 🔑 ID vine din JWT
    const clientId = req.client.id;

    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const { Password, ...safeClient } = client.dataValues;

    // Găsește rezervările utilizatorului
    const allReservations = await Reservation.findAll({
      where: { ClientId: clientId },
      include: [
        {
          model: Room,
          through: { attributes: [] },
          include: [
            {
              model: RoomTheme,
              attributes: ['city', 'name', 'theme']
            }
          ]
        }
      ],
      order: [['requestedCheckin', 'DESC']]
    });

    // Găsește următoarea rezervare (viitoare)
    const now = new Date();
    const upcomingReservations = allReservations.filter(r => new Date(r.requestedCheckin) >= now);
    // Sortează crescător după check-in (cea mai apropiată prima)
    upcomingReservations.sort((a, b) => new Date(a.requestedCheckin) - new Date(b.requestedCheckin));
    const nextReservation = upcomingReservations.length > 0 ? upcomingReservations[0] : null;

    let nextDestination = null;
    if (nextReservation && nextReservation.Rooms && nextReservation.Rooms.length > 0) {
      const room = nextReservation.Rooms[0];
      const roomTheme = room.RoomTheme;
      nextDestination = {
        reservationId: nextReservation.ReservationId,
        city: roomTheme?.city || "City",
        room: roomTheme?.name || room.name || "Room",
        checkIn: nextReservation.requestedCheckin,
        checkOut: nextReservation.requestedCheckout,
        guests: nextReservation.nrPeople || 1
      };
    }

    // Rezervări recente (ultimele 5, doar cele plătite complet)
    const recentReservations = await Promise.all(
      allReservations.slice(0, 10).map(async (reservation) => {
        const room = reservation.Rooms && reservation.Rooms.length > 0 ? reservation.Rooms[0] : null;
        const roomTheme = room?.RoomTheme;
        const invoice = await getInvoiceByReservationId(reservation.ReservationId);
        
        // Doar dacă factura este paid
        if (invoice?.status !== 'paid') {
          return null;
        }

        const checkInDate = new Date(reservation.requestedCheckin);
        const checkOutDate = new Date(reservation.requestedCheckout);
        const today = new Date();
        
        // Resetăm orele pentru comparare corectă (doar ziua)
        today.setHours(0, 0, 0, 0);
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(0, 0, 0, 0);
        
        // Determină statusul
        let bookingStatus = 'past';
        if (checkInDate > today) {
          bookingStatus = 'upcoming'; // încă nu a început
        } else if (checkOutDate >= today) {
          bookingStatus = 'active'; // în desfășurare
        }

        console.log(`Reservation #${reservation.ReservationId}: CheckIn=${checkInDate.toISOString()}, CheckOut=${checkOutDate.toISOString()}, Today=${today.toISOString()}, Status=${bookingStatus}`);
        
        return {
          reservationId: reservation.ReservationId,
          room: roomTheme?.name || "Unknown",
          city: roomTheme?.city || "City",
          checkIn: reservation.requestedCheckin,
          checkOut: reservation.requestedCheckout,
          status: bookingStatus,
          totalAmount: invoice?.totalAmount || 0
        };
      })
    );

    // Filtrează null-urile (rezervările neplătite)
    const paidReservations = recentReservations.filter(r => r !== null).slice(0, 5);

    // Toate rezervările (pentru Profile page)
    const allReservationsFormatted = await Promise.all(
      allReservations.map(async (reservation) => {
        const room = reservation.Rooms && reservation.Rooms.length > 0 ? reservation.Rooms[0] : null;
        const roomTheme = room?.RoomTheme;
        const invoice = await getInvoiceByReservationId(reservation.ReservationId);
        
        return {
          reservationId: reservation.ReservationId,
          room: roomTheme?.name || "Unknown",
          city: roomTheme?.city || "City",
          checkIn: reservation.requestedCheckin,
          checkOut: reservation.requestedCheckout,
          status: invoice?.status || "pending",
          totalAmount: invoice?.totalAmount || 0
        };
      })
    );

    res.json({
      client: safeClient,
      cityPoints: 1200,
      status: "Gold",
      nextDestination,
      recentReservations: paidReservations,
      allReservations: allReservationsFormatted
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
