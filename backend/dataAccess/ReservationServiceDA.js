// backend/dataAccess/ReservationServiceDA.js
import ReservationService from "../entities/ReservationService.js";
import Service from "../entities/Service.js";
import Reservation from "../entities/Reservation.js";
import { isPositiveInteger, isValidEmail, isValidPersonName } from "../utils/validators.js";

function normalizeReservationServicePayload(data) {
  return {
    ReservationId: data.ReservationId ?? data.reservationId,
    ServiceId: data.ServiceId ?? data.serviceId,
    quantity: Number(data.quantity ?? 1),
    unitPrice: data.unitPrice,
    personDetails: data.personDetails ?? data.guestDetails ?? null
  };
}

function validatePersonDetails(personDetails) {
  if (!Array.isArray(personDetails) || personDetails.length === 0) {
    throw new Error("personDetails required for per_person service");
  }

  for (const person of personDetails) {
    if (!isValidPersonName(person?.name) || !isValidEmail(person?.email)) {
      throw new Error("Each person must have a valid full name and email");
    }
  }
}

/* CREATE - Add a service to a reservation */
export async function addServiceToReservation(data) {
  const normalized = normalizeReservationServicePayload(data);
  const { ReservationId, ServiceId, personDetails } = normalized;

  if (!ReservationId || !ServiceId) {
    throw new Error("ReservationId and ServiceId are required");
  }

  const service = await Service.findByPk(ServiceId);
  if (!service) throw new Error("Service not found");
  if (service.status !== "activ" || !service.bookableOnline) {
    throw new Error("Selected service is not available");
  }

  const reservation = await Reservation.findByPk(ReservationId);
  if (!reservation) throw new Error("Reservation not found");

  const isPerPerson = service.priceType === "per_person";
  if (!isPositiveInteger(normalized.quantity)) {
    throw new Error("Service quantity must be a positive number");
  }
  let quantity = normalized.quantity;

  if (isPerPerson) {
    if (personDetails) {
      validatePersonDetails(personDetails);
      quantity = personDetails.length;
    }

    const maxPeople = reservation.nrPeople || 1;
    if (quantity > maxPeople) {
      throw new Error(`This stay allows up to ${maxPeople} people`);
    }
  }

  const unitPrice = normalized.unitPrice !== undefined
    ? Number(normalized.unitPrice)
    : Number(service.price || 0);

  if (Number.isNaN(unitPrice)) {
    throw new Error("Invalid unitPrice");
  }

  const existing = await ReservationService.findOne({
    where: { ReservationId, ServiceId }
  });

  if (existing) {
    existing.quantity = quantity;
    existing.unitPrice = unitPrice;
    existing.personDetails = isPerPerson ? personDetails : null;
    await existing.save();
    return existing;
  }

  return await ReservationService.create({
    ReservationId,
    ServiceId,
    quantity,
    unitPrice,
    personDetails: isPerPerson ? personDetails : null
  });
}

/* READ - All services for a reservation */
export async function getReservationServices(reservationId) {
  return await ReservationService.findAll({
    where: { ReservationId: reservationId },
    include: [
      {
        model: Service,
        attributes: ["ServiceId", "name", "description", "price", "category", "priceType"]
      }
    ]
  });
}

/* READ ONE - One reservation service */
export async function getReservationService(reservationId, serviceId) {
  return await ReservationService.findOne({
    where: {
      ReservationId: reservationId,
      ServiceId: serviceId
    },
    include: [
      {
        model: Service,
        attributes: ["ServiceId", "name", "description", "price", "category", "priceType"]
      }
    ]
  });
}

/* UPDATE - Update service quantity/details */
export async function updateReservationService(reservationId, serviceId, data) {
  const reservationService = await ReservationService.findOne({
    where: { ReservationId: reservationId, ServiceId: serviceId },
    include: [{ model: Service }]
  });

  if (!reservationService) return null;

  const isPerPerson = reservationService.Service?.priceType === "per_person";
  const personDetails = data.personDetails ?? data.guestDetails;

  if (isPerPerson && personDetails !== undefined) {
    validatePersonDetails(personDetails);
    reservationService.personDetails = personDetails;
    reservationService.quantity = personDetails.length;
  } else if (data.quantity !== undefined) {
    reservationService.quantity = data.quantity;
  }

  if (data.unitPrice !== undefined) reservationService.unitPrice = data.unitPrice;

  await reservationService.save();
  return reservationService;
}

/* DELETE - Remove one service */
export async function removeServiceFromReservation(reservationId, serviceId) {
  const service = await ReservationService.findOne({
    where: { ReservationId: reservationId, ServiceId: serviceId }
  });

  if (!service) return null;

  await service.destroy();
  return service;
}

/* DELETE ALL - Remove all services from a reservation */
export async function clearReservationServices(reservationId) {
  return await ReservationService.destroy({
    where: { ReservationId: reservationId }
  });
}

/* CALCULATE TOTAL - Calculate services total for a reservation */
export async function calculateServicesTotal(reservationId) {
  const services = await ReservationService.findAll({
    where: { ReservationId: reservationId }
  });

  const total = services.reduce((sum, service) => {
    return sum + (parseFloat(service.unitPrice) * service.quantity);
  }, 0);

  return total;
}
