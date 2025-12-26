import Hotel from "../entities/Hotel.js";

async function createHotel(payload) {
  return await Hotel.create(payload);
}

async function getHotelById(id) {
  return await Hotel.findByPk(id);
}

async function getHotels() {
  return await Hotel.findAll();
}

async function updateHotel(id, data) {
  const elem = await Hotel.findByPk(id);
  if (!elem) return null;
  return await elem.update(data);
}

async function deleteHotel(id) {
  const elem = await Hotel.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createHotel,
  getHotelById,
  getHotels,
  updateHotel,
  deleteHotel
};
