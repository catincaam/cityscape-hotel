const TEXT_REPLACEMENTS = [
  [/\uFFFD\??T?s/g, "'s"],
  [/â€™|â€˜|ï¿½T|ï¿½â„¢/g, "'"],
  [/â€œ|â€�|ï¿½/g, '"'],
  [/â€“/g, "-"],
  [/â€”/g, "-"],
  [/Â/g, ""]
];

export function normalizeText(value) {
  if (typeof value !== "string") return value;

  return TEXT_REPLACEMENTS.reduce(
    (normalized, [pattern, replacement]) => normalized.replace(pattern, replacement),
    value
  );
}

export function normalizeTextValues(value) {
  if (typeof value === "string") return normalizeText(value);
  if (Array.isArray(value)) return value.map(normalizeTextValues);
  if (!value || typeof value !== "object") return value;

  if (typeof value.toJSON === "function") {
    return normalizeTextValues(value.toJSON());
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalizeTextValues(item)])
  );
}
