const NAME_REGEX = /^[A-Za-zÀ-ž' -]{2,}$/;
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
  const start = parseDateInput(checkIn);
  const end = parseDateInput(checkOut);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function getTodayDateInputValue() {
  return toDateInputValue(new Date());
}

export function getBookingWindowMaxDate() {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  return toDateInputValue(maxDate);
}

export function isWithinBookingWindow(checkIn, checkOut) {
  const start = parseDateInput(checkIn);
  const end = parseDateInput(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  const today = parseDateInput(getTodayDateInputValue());
  const maxDate = parseDateInput(getBookingWindowMaxDate());
  return start >= today && end >= today && start <= maxDate && end <= maxDate;
}
