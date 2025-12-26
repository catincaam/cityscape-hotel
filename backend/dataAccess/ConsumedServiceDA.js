import ConsumedService from "../entities/ConsumedService.js";

async function createConsumedService(payload) {
  return await ConsumedService.create(payload);
}

async function getConsumedService(invoiceId, serviceId) {
  return await ConsumedService.findOne({ where: { InvoiceId: invoiceId, ServiceId: serviceId } });
}

async function getConsumedServices() {
  return await ConsumedService.findAll();
}

async function updateConsumedService(invoiceId, serviceId, data) {
  const elem = await ConsumedService.findOne({ where: { InvoiceId: invoiceId, ServiceId: serviceId } });
  if (!elem) return null;
  return await elem.update(data);
}

async function deleteConsumedService(invoiceId, serviceId) {
  const elem = await ConsumedService.findOne({ where: { InvoiceId: invoiceId, ServiceId: serviceId } });
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createConsumedService,
  getConsumedService,
  getConsumedServices,
  updateConsumedService,
  deleteConsumedService
};
