import { Op } from "sequelize";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
import RoomImage from "../entities/RoomImage.js";
import Reservation from "../entities/Reservation.js";

/* CRUD EXISTENT */

async function createRoom(payload) {
  return await Room.create(payload);
}

async function getRoomById(id) {
  return await Room.findByPk(id, {
    include: RoomTheme
  });
}

async function getRooms() {
  return await Room.findAll({
    include: RoomTheme
  });
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

async function getAvailableRooms({ checkIn, checkOut, guests }) {
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

  console.log("DEBUG Available Rooms:", JSON.stringify(rooms, null, 2).substring(0, 500));

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

export {
  createRoom,
  getRoomById,
  getRooms,
  updateRoom,
  deleteRoom,
  getAvailableRooms
};
