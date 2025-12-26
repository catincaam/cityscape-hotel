import Client from "../entities/Client.js";

async function createClient(payload) {
  return await Client.create(payload);
}

async function getClientById(id) {
  return await Client.findByPk(id);
}

async function getClientByEmail(email) {
  return await Client.findOne({ where: { Email: email } });
}

async function getClients() {
  return await Client.findAll();
}

async function updateClient(id, data) {
  const elem = await Client.findByPk(id);
  if (!elem) return null;
  return await elem.update(data);
}

async function deleteClient(id) {
  const elem = await Client.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createClient,
  getClientById,
  getClientByEmail,
  getClients,
  updateClient,
  deleteClient
};
