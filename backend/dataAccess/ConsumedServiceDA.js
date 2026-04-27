import ConsumedService from "../entities/ConsumedService.js";

import Service from "../entities/Service.js";

async function createConsumedService(payload) {
  // Suport pentru servicii per_person
  const { ServiceId, personDetails } = payload;
  const service = await Service.findByPk(ServiceId);
  if (!service) throw new Error("Service not found");

  // Dacă e per_person, validăm și calculăm prețul
  if (service.priceType === "per_person") {
    if (!Array.isArray(personDetails) || personDetails.length === 0) {
      throw new Error("personDetails required for per_person service");
    }
    // Validare fiecare persoană
    for (const p of personDetails) {
      if (!p.name || !p.email) throw new Error("Each person must have name and email");
    }
    payload.quantity = personDetails.length;
    payload.paidPrice = parseFloat(service.price) * personDetails.length;
  } else {
    // fallback: paidPrice = price * quantity
    payload.paidPrice = parseFloat(service.price) * (payload.quantity || 1);
  }
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
