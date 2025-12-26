// backend/dataAccess/StayDA.js
import Reservation from "../entities/Reservation.js"; // sau Stay.js dacă tabela se numește așa

// CREATE
async function createStay(payload) {
  return await Reservation.create(payload);
}

// READ BY ID
async function getStayById(id) {
  return await Reservation.findByPk(id);
}

// READ ALL (poți filtra după client, hotel etc.)
async function getStays(filter = {}) {
  return await Reservation.findAll({ where: filter });
}

// UPDATE
async function updateStay(id, data) {
  const stay = await Reservation.findByPk(id);
  if (!stay) return null;
  return await stay.update(data);
}

// DELETE
async function deleteStay(id) {
  const stay = await Reservation.findByPk(id);
  if (!stay) return null;
  return await stay.destroy();
}

export {
  createStay,
  getStayById,
  getStays,
  updateStay,
  deleteStay,
};
