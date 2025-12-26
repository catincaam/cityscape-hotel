import Service from "../entities/Service.js";

async function createService(payload) {
  const {
    name,
    category,
    price,
    description,
    status,
    bookableOnline,
    availableForExternalGuests,
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
    image: image || null
  });
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
  return await service.destroy();
}

export { createService, getServices, getServiceById, deleteService };
