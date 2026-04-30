const NAME_REGEX = /^[A-Za-zÀ-ž' -]{3,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPersonName(value) {
  return NAME_REGEX.test(String(value || "").trim());
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email || "").trim().toLowerCase());
}

export function isStrongPassword(password) {
  const value = String(password || "");
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
}

export function isValidDateRange(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end;
}
