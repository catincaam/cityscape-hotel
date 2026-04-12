
import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";

async function createReservation(payload) {
  return await Reservation.create(payload);
}

async function getReservationById(id) {
  return await Reservation.findByPk(id, {
    include: [
      {
        model: RoomReservation,
        include: [
          {
            model: Room,
            include: [
              {
                model: RoomTheme,
                attributes: ["city", "name", "theme"]
              }
            ]
          }
        ]
      }
    ]
  });
}

// Returnează rezervări cu join la Room și RoomTheme (city, name)
async function getReservations() {
  return await Reservation.findAll({
    include: [
      {
        model: RoomReservation,
        include: [
          {
            model: Room,
            include: [
              {
                model: RoomTheme,
                attributes: ["city", "name"]
              }
            ]
          }
        ]
      }
    ]
  });
}

async function updateReservation(id, data) {
  const elem = await Reservation.findByPk(id);
  if (!elem) return null;
  return await elem.update(data);
}

async function deleteReservation(id) {
  const elem = await Reservation.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createReservation,
  getReservationById,
  getReservations,
  updateReservation,
  deleteReservation
};
