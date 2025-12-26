// backend/dataAccess/ReservationServiceDA.js
import ReservationService from "../entities/ReservationService.js";
import Service from "../entities/Service.js";

/* CREATE - Adaugă un serviciu la rezervare */
export async function addServiceToReservation(data) {
  const { ReservationId, ServiceId, quantity, unitPrice } = data;
  
  // Verificăm dacă serviciul există deja
  const existing = await ReservationService.findOne({
    where: { ReservationId, ServiceId }
  });

  if (existing) {
    // Actualizăm cantitatea dacă serviciul există deja
    existing.quantity = quantity;
    await existing.save();
    return existing;
  }

  // Creăm un nou serviciu pentru rezervare
  return await ReservationService.create({
    ReservationId,
    ServiceId,
    quantity,
    unitPrice
  });
}

/* READ - Toate serviciile pentru o rezervare */
export async function getReservationServices(reservationId) {
  return await ReservationService.findAll({
    where: { ReservationId: reservationId },
    include: [
      {
        model: Service,
        attributes: ["ServiceId", "name", "description", "price", "category"]
      }
    ]
  });
}

/* READ ONE - Un serviciu specific din rezervare */
export async function getReservationService(reservationId, serviceId) {
  return await ReservationService.findOne({
    where: {
      ReservationId: reservationId,
      ServiceId: serviceId
    },
    include: [
      {
        model: Service,
        attributes: ["ServiceId", "name", "description", "price", "category"]
      }
    ]
  });
}

/* UPDATE - Actualizează cantitatea unui serviciu */
export async function updateReservationService(reservationId, serviceId, data) {
  const service = await ReservationService.findOne({
    where: { ReservationId: reservationId, ServiceId: serviceId }
  });

  if (!service) return null;

  if (data.quantity !== undefined) service.quantity = data.quantity;
  if (data.unitPrice !== undefined) service.unitPrice = data.unitPrice;

  await service.save();
  return service;
}

/* DELETE - Șterge un serviciu din rezervare */
export async function removeServiceFromReservation(reservationId, serviceId) {
  const service = await ReservationService.findOne({
    where: { ReservationId: reservationId, ServiceId: serviceId }
  });

  if (!service) return null;

  await service.destroy();
  return service;
}

/* DELETE ALL - Șterge toate serviciile unei rezervări */
export async function clearReservationServices(reservationId) {
  return await ReservationService.destroy({
    where: { ReservationId: reservationId }
  });
}

/* CALCULATE TOTAL - Calculează totalul serviciilor pentru o rezervare */
export async function calculateServicesTotal(reservationId) {
  const services = await ReservationService.findAll({
    where: { ReservationId: reservationId }
  });

  const total = services.reduce((sum, service) => {
    return sum + (parseFloat(service.unitPrice) * service.quantity);
  }, 0);

  return total;
}
