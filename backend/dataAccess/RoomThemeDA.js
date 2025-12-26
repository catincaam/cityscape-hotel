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

/* DELETE */
async function deleteRoomTheme(id) {
  const elem = await RoomTheme.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createRoomTheme,
  getRoomThemeById,
  getRoomThemes,
  updateRoomTheme,
  deleteRoomTheme
};
