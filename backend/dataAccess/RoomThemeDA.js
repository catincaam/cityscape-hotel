import RoomTheme from "../entities/RoomTheme.js";
import RoomImage from "../entities/RoomImage.js";

/* CREATE */
async function createRoomTheme(payload) {
  return await RoomTheme.create(payload);
}

/* READ by ID */
async function getRoomThemeById(id) {
  return await RoomTheme.findByPk(id, {
    include: [{
      model: RoomImage,
      as: "images"
    }]
  });
}

/* READ all */
async function getRoomThemes() {
  return await RoomTheme.findAll();
}

/* UPDATE */
async function updateRoomTheme(id, data) {
  const elem = await RoomTheme.findByPk(id);
  if (!elem) return null;
  return await elem.update(data);
}


import Room from "../entities/Room.js";

/* DELETE */
async function deleteRoomTheme(id) {
  const elem = await RoomTheme.findByPk(id);
  if (!elem) return null;
  // Verificăm dacă există camere care folosesc această temă
  const rooms = await Room.findAll({ where: { RoomThemeId: id } });
  if (rooms.length > 0) {
    const roomIds = rooms.map(r => r.RoomId);
    const msg = `Nu se poate șterge tema: există camere (${roomIds.join(", ")}) care folosesc această temă.`;
    const err = new Error(msg);
    err.code = 'THEME_IN_USE';
    throw err;
  }
  return await elem.destroy();
}

export {
  createRoomTheme,
  getRoomThemeById,
  getRoomThemes,
  updateRoomTheme,
  deleteRoomTheme
};
