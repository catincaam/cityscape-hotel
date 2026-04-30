const NAME_REGEX = /^[A-Za-zÀ-ž' -]{3,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidPersonName(value) {
  return NAME_REGEX.test(String(value || "").trim());
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

function isStrongPassword(password) {
  const value = String(password || "");
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
}

function parseValidDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isValidDateRange(checkIn, checkOut) {
  const start = parseValidDate(checkIn);
  const end = parseValidDate(checkOut);
  return Boolean(start && end && start < end);
}

function isPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

function isPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function isValidRating(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5;
}

function isValidCardNumber(value) {
  return /^\d{13,19}$/.test(String(value || "").replace(/\s/g, ""));
}

function isValidCvc(value) {
  return /^\d{3,4}$/.test(String(value || "").replace(/\s/g, ""));
}

function isFutureExpiry(value) {
  const match = String(value || "").trim().match(/^(\d{2})\/(\d{2}|\d{4})$/);
  if (!match) return false;

  const month = Number(match[1]);
  if (month < 1 || month > 12) return false;

  const rawYear = Number(match[2]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const expiryEnd = new Date(year, month, 0, 23, 59, 59, 999);
  return expiryEnd >= new Date();
}

export {
  normalizeEmail,
  isValidPersonName,
  isValidEmail,
  isStrongPassword,
  isValidDateRange,
  isPositiveInteger,
  isPositiveNumber,
  isValidRating,
  isValidCardNumber,
  isValidCvc,
  isFutureExpiry
};
