import { Op } from "sequelize";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
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
  // 1. Rezervări care se suprapun cu perioada cerută
  const reservations = await Reservation.findAll({
    where: {
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

  // 3. Camere libere + tema
  return await Room.findAll({
    where: {
      RoomId: occupiedRoomIds.length
        ? { [Op.notIn]: occupiedRoomIds }
        : { [Op.ne]: null }
    },
    include: RoomTheme
  });
}

export {
  createRoom,
  getRoomById,
  getRooms,
  updateRoom,
  deleteRoom,
  getAvailableRooms
};
