import ClientType from "../entities/ClientType.js";

async function createClientType(payload) {
  return await ClientType.create(payload);
}

async function getClientTypeByTip(tip) {
  return await ClientType.findByPk(tip);
}

async function getClientTypes() {
  return await ClientType.findAll();
}

async function updateClientType(tip, data) {
  const elem = await ClientType.findByPk(tip);
  if (!elem) return null;
  return await elem.update(data);
}

async function deleteClientType(tip) {
  const elem = await ClientType.findByPk(tip);
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createClientType,
  getClientTypeByTip,
  getClientTypes,
  updateClientType,
  deleteClientType
};
