import Staff from "../entities/Staff.js";

async function createStaff(payload) {
  return await Staff.create(payload);
}

async function getStaffById(id) {
  return await Staff.findByPk(id);
}

async function getStaffs() {
  return await Staff.findAll();
}

async function updateStaff(id, data) {
  const elem = await Staff.findByPk(id);
  if (!elem) return null;
  return await elem.update(data);
}

async function deleteStaff(id) {
  const elem = await Staff.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createStaff,
  getStaffById,
  getStaffs,
  updateStaff,
  deleteStaff
};
