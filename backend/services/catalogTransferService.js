import ClientType from "../entities/ClientType.js";
import Hotel from "../entities/Hotel.js";
import RoomTheme from "../entities/RoomTheme.js";
import Room from "../entities/Room.js";
import RoomImage from "../entities/RoomImage.js";
import Service from "../entities/Service.js";
import Reward from "../entities/Reward.js";
import Staff from "../entities/Staff.js";

const catalogModels = [
  { key: "clientTypes", model: ClientType },
  { key: "hotels", model: Hotel },
  { key: "roomThemes", model: RoomTheme },
  { key: "rooms", model: Room },
  { key: "roomImages", model: RoomImage },
  { key: "services", model: Service },
  { key: "rewards", model: Reward },
  { key: "staff", model: Staff }
];

function getPrimaryKeys(model) {
  return Object.entries(model.rawAttributes)
    .filter(([, attribute]) => attribute.primaryKey)
    .map(([name]) => name);
}

function getUpdatableFields(model) {
  const primaryKeys = new Set(getPrimaryKeys(model));
  return Object.keys(model.rawAttributes).filter((field) => !primaryKeys.has(field));
}

function normalizeRows(rows = []) {
  return rows.map((row) => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[key] = value instanceof Date ? value.toISOString() : value;
    });
    return normalized;
  });
}

export async function exportCatalogData() {
  const payload = {};

  for (const { key, model } of catalogModels) {
    const rows = await model.findAll({ raw: true });
    payload[key] = normalizeRows(rows);
  }

  return {
    exportedAt: new Date().toISOString(),
    source: "cityscape-local-catalog",
    payload
  };
}

export async function importCatalogData(catalog, transaction) {
  const payload = catalog?.payload || catalog;
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid catalog payload.");
  }

  const summary = {};

  for (const { key, model } of catalogModels) {
    const rows = Array.isArray(payload[key]) ? payload[key] : [];
    summary[key] = rows.length;

    if (!rows.length) continue;

    await model.bulkCreate(rows, {
      updateOnDuplicate: getUpdatableFields(model),
      transaction
    });
  }

  return summary;
}
