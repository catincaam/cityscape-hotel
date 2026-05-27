import RoomTheme from "../entities/RoomTheme.js";
import { normalizeText } from "../utils/normalizeText.js";

const TEXT_FIELDS = [
  "city",
  "continent",
  "theme",
  "name",
  "description",
  "bedType"
];

export async function repairRoomThemeText() {
  const themes = await RoomTheme.findAll();
  let repairedCount = 0;

  for (const theme of themes) {
    const updates = {};

    TEXT_FIELDS.forEach((field) => {
      const original = theme[field];
      const normalized = normalizeText(original);
      if (normalized !== original) {
        updates[field] = normalized;
      }
    });

    if (Object.keys(updates).length > 0) {
      await theme.update(updates);
      repairedCount += 1;
    }
  }

  return repairedCount;
}
