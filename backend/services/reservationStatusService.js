const FINAL_STATUSES = new Set(["cancelled", "canceled"]);

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function hasValidStayDates(reservation) {
  return reservation?.requestedCheckin && reservation?.requestedCheckout;
}

export function getReservationLifecycleStatus(reservation, now = new Date()) {
  if (!reservation) return null;

  const currentStatus = normalizeStatus(reservation.status);
  if (FINAL_STATUSES.has(currentStatus)) return "cancelled";
  if (currentStatus === "pending") return "pending";
  if (!hasValidStayDates(reservation)) return currentStatus || "pending";

  const checkin = new Date(reservation.requestedCheckin);
  const checkout = new Date(reservation.requestedCheckout);

  if (Number.isNaN(checkin.getTime()) || Number.isNaN(checkout.getTime())) {
    return currentStatus || "pending";
  }

  if (checkout < now) return "completed";
  if (checkin <= now && now < checkout) return "active";
  return "upcoming";
}

export async function syncReservationStatus(reservation, now = new Date()) {
  if (!reservation) return null;

  const lifecycleStatus = getReservationLifecycleStatus(reservation, now);
  if (!lifecycleStatus) return reservation;

  if (normalizeStatus(reservation.status) !== lifecycleStatus) {
    reservation.status = lifecycleStatus;
    await reservation.save();
  }

  return reservation;
}

export async function syncReservationStatuses(reservations, now = new Date()) {
  await Promise.all((reservations || []).map((reservation) => syncReservationStatus(reservation, now)));
  return reservations;
}
