import Reservation from "../entities/Reservation.js";

async function createReservation(payload) {
  return await Reservation.create(payload);
}

async function getReservationById(id) {
  return await Reservation.findByPk(id);
}

async function getReservations() {
  return await Reservation.findAll();
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
