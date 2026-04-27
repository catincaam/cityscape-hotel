import Service from "../entities/Service.js";
import ReservationService from "../entities/ReservationService.js";

async function createService(payload) {
  const {
    name,
    category,
    price,
    description,
    status,
    bookableOnline,
    availableForExternalGuests,
    priceType,
    image
  } = payload;

  if (!name || !category) {
    throw new Error("Missing required fields");
  }

  const parsedPrice = Number(price);
  if (!parsedPrice || isNaN(parsedPrice)) {
    throw new Error("Invalid price");
  }

  return await Service.create({
    name,
    category,
    description: description || "",
    price: parsedPrice,
    status: status || "activ",
    bookableOnline: bookableOnline ?? true,
    availableForExternalGuests: availableForExternalGuests ?? false,
    priceType: priceType || "per_booking",
    image: image || null
  });
}

async function updateService(id, payload) {
  const {
    name,
    category,
    price,
    description,
    status,
    bookableOnline,
    availableForExternalGuests,
    priceType,
    image
  } = payload;

  const service = await Service.findByPk(id);
  if (!service) throw new Error("Service not found");

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (price !== undefined) {
    const parsedPrice = Number(price);
    if (!parsedPrice || isNaN(parsedPrice)) throw new Error("Invalid price");
    updates.price = parsedPrice;
  }
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (bookableOnline !== undefined) updates.bookableOnline = bookableOnline;
  if (availableForExternalGuests !== undefined) updates.availableForExternalGuests = availableForExternalGuests;
  if (priceType !== undefined) updates.priceType = priceType;
  if (image !== undefined) updates.image = image;

  await service.update(updates);
  return service;
}

async function getServices() {
  return await Service.findAll({ order: [["createdAt", "DESC"]] });
}

async function getServiceById(id) {
  return await Service.findByPk(id);
}

async function deleteService(id) {
  const service = await Service.findByPk(id);
  if (!service) return null;
  // Verificăm dacă există rezervări asociate
  const count = await ReservationService.count({ where: { ServiceId: id } });
  if (count > 0) {
    const error = new Error("Nu poți șterge serviciul pentru că există rezervări asociate acestuia.");
    error.code = 'HAS_RESERVATIONS';
    throw error;
  }
  try {
    return await service.destroy();
  } catch (err) {
    // Alte erori DB
    throw new Error("Eroare la ștergere serviciu: " + err.message);
  }
}

export { createService, updateService, getServices, getServiceById, deleteService };
