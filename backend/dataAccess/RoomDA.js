import { Op } from "sequelize";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
import RoomImage from "../entities/RoomImage.js";
import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";

/* CRUD EXISTENT */

async function createRoom(payload) {
  return await Room.create(payload);
}

async function getRoomById(id) {
  return await Room.findByPk(id, {
    include: RoomTheme
  });
}

// import { Op } from "sequelize"; // Removed duplicate import
// import Reservation from "../entities/Reservation.js"; // Removed duplicate import

async function getRooms() {
  // 1. Fetch all rooms with theme
  const rooms = await Room.findAll({
    include: RoomTheme
  });

  // 2. Fetch all active reservations for today
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const reservations = await Reservation.findAll({
    where: {
      status: { [Op.in]: ["active", "paid", "upcoming"] },
      requestedCheckin: { [Op.lte]: tomorrow },
      requestedCheckout: { [Op.gte]: today }
    }
  });

  // 3. Build a set of occupied RoomIds
  const occupiedRoomIds = new Set();
  for (const res of reservations) {
    if (res.RoomReservations) {
      for (const rr of res.RoomReservations) {
        occupiedRoomIds.add(rr.RoomId);
      }
    }
  }

  // 4. For each room, set status
  const RoomReservation = (await import("../entities/RoomReservation.js")).default;
  for (const room of rooms) {
    // If maintenance, keep it
    if (room.status === "maintenance") continue;

    // Check if occupied
    // Find if there is an active reservation for this room
    const occ = await RoomReservation.findOne({
      where: {
        RoomId: room.RoomId,
        ReservationId: { [Op.in]: reservations.map(r => r.ReservationId) }
      }
    });
    if (occ) {
      room.status = "occupied";
    } else {
      room.status = "available";
    }
  }
  return rooms;
}

async function updateRoom(id, data) {
  const elem = await Room.findByPk(id);
  if (!elem) return null;
  return await elem.update(data);
}

async function deleteRoom(id) {
  const elem = await Room.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

/* ⭐ LOGICĂ BUSINESS – CAMERE DISPONIBILE ⭐ */

async function getAvailableRoomsLegacy({ checkIn, checkOut, guests }) {
  // 1. Rezervări CONFIRMATE care se suprapun cu perioada cerută
  const reservations = await Reservation.findAll({
    where: {
      status: { [Op.in]: ['paid', 'completed', 'active'] }, // Doar rezervări confirmate/active
      [Op.or]: [
        {
          requestedCheckin: { [Op.between]: [checkIn, checkOut] }
        },
        {
          requestedCheckout: { [Op.between]: [checkIn, checkOut] }
        },
        {
          requestedCheckin: { [Op.lte]: checkIn },
          requestedCheckout: { [Op.gte]: checkOut }
        }
      ]
    },
    include: {
      model: Room,
      through: { attributes: [] }
    }
  });

  // 2. RoomId ocupate
  const occupiedRoomIds = reservations.flatMap(r =>
    r.Rooms.map(room => room.RoomId)
  );

  // 3. Camere libere + tema (cu toți detaii) + capacitate
  const rooms = await Room.findAll({
    where: {
      RoomId: occupiedRoomIds.length
        ? { [Op.notIn]: occupiedRoomIds }
        : { [Op.ne]: null }
    },
    include: [{
      model: RoomTheme,
      include: [{
        model: RoomImage,
        as: 'images',
        required: false
      }]
    }]
  });

  // 4. Filtrare după capacitate maximă
  const filtered = rooms.filter(room => {
    const maxGuests = room.RoomTheme?.maxGuests || 2;
    return maxGuests >= guests;
  });

  // 5. Grupare după RoomThemeId
  const grouped = {};
  filtered.forEach(room => {
    const themeId = room.RoomTheme?.RoomThemeId;
    if (!grouped[themeId]) {
      grouped[themeId] = {
        ...room.toJSON(),
        availableCount: 0
      };
    }
    grouped[themeId].availableCount += 1;
  });

// Returnez array de teme cu count
  return Object.values(grouped);
}

async function getAvailableRooms({ checkIn, checkOut, guests }) {
  // Confirmed reservations that overlap the requested interval.
  // Half-open interval: a same-day checkout does not block a new check-in.
  const reservations = await Reservation.findAll({
    where: {
      status: { [Op.notIn]: ["cancelled", "pending"] },
      requestedCheckin: { [Op.lt]: checkOut },
      requestedCheckout: { [Op.gt]: checkIn }
    }
  });

  const reservationIds = reservations.map((reservation) => reservation.ReservationId);
  const occupiedRoomReservations = reservationIds.length
    ? await RoomReservation.findAll({
        where: {
          ReservationId: { [Op.in]: reservationIds }
        }
      })
    : [];
  const occupiedRoomIds = occupiedRoomReservations.map(
    (roomReservation) => roomReservation.RoomId
  );

  const rooms = await Room.findAll({
    where: {
      RoomId: occupiedRoomIds.length
        ? { [Op.notIn]: occupiedRoomIds }
        : { [Op.ne]: null }
    },
    include: [
      {
        model: RoomTheme,
        as: "RoomTheme",
        include: [
          {
            model: RoomImage,
            as: "images",
            required: false
          }
        ]
      }
    ]
  });

  const filtered = rooms.filter((room) => {
    const maxGuests = room.RoomTheme?.maxGuests || 2;
    return maxGuests >= guests;
  });

  const grouped = {};
  filtered.forEach((room) => {
    const themeId = room.RoomTheme?.RoomThemeId;
    if (!themeId) return;

    if (!grouped[themeId]) {
      grouped[themeId] = {
        ...room.toJSON(),
        availableCount: 0
      };
    }
    grouped[themeId].availableCount += 1;
  });

  return Object.values(grouped);
}

export {
  createRoom,
  getRoomById,
  getRooms,
  updateRoom,
  deleteRoom,
  getAvailableRooms
};
