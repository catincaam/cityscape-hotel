import RoomReservation from "../entities/RoomReservation.js";

async function createRoomReservation(payload) {
  return await RoomReservation.create(payload);
}

async function getRoomReservation(reservationId, roomId) {
  return await RoomReservation.findOne({ where: { ReservationId: reservationId, RoomId: roomId } });
}

async function getRoomReservations() {
  return await RoomReservation.findAll();
}

async function deleteRoomReservation(reservationId, roomId) {
  const elem = await RoomReservation.findOne({ where: { ReservationId: reservationId, RoomId: roomId } });
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createRoomReservation,
  getRoomReservation,
  getRoomReservations,
  deleteRoomReservation
};
