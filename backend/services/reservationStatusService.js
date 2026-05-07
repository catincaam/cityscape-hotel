import Invoice from "../entities/Invoice.js";
import Payment from "../entities/Payment.js";

const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function hasValidStayDates(reservation) {
  return reservation?.requestedCheckin && reservation?.requestedCheckout;
}

function toNumber(value) {
  return Number.parseFloat(value || 0) || 0;
}

async function getPaymentSummary(reservation) {
  const invoice = reservation.Invoice || await Invoice.findOne({
    where: { ReservationId: reservation.ReservationId },
    include: [{ model: Payment, as: "payments", required: false }]
  });

  if (!invoice) return null;

  const totalAmount = toNumber(invoice.totalAmount);
  const payments = invoice.payments || await Payment.findAll({
    where: { InvoiceId: invoice.InvoiceId }
  });
  const totalPaid = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  return {
    totalAmount,
    totalPaid,
    isFullyPaid: totalAmount > 0 && totalPaid >= totalAmount
  };
}

export function getReservationLifecycleStatus(reservation, now = new Date(), paymentSummary = null) {
  if (!reservation) return null;

  const currentStatus = normalizeStatus(reservation.status);
  if (CANCELLED_STATUSES.has(currentStatus)) return "cancelled";
  if (currentStatus === "completed") return "completed";
  if (!hasValidStayDates(reservation)) return currentStatus || "pending";

  const checkin = new Date(reservation.requestedCheckin);
  const checkout = new Date(reservation.requestedCheckout);

  if (Number.isNaN(checkin.getTime()) || Number.isNaN(checkout.getTime())) {
    return currentStatus || "pending";
  }

  if (currentStatus === "pending") return "pending";

  if (checkout < now) return "completed";

  if (paymentSummary && paymentSummary.totalAmount > 0 && !paymentSummary.isFullyPaid) {
    const hoursUntilCheckin = (checkin - now) / (1000 * 60 * 60);
    if (hoursUntilCheckin < 24) return "cancelled";
  }

  if (checkin <= now && now < checkout) return "active";
  return "upcoming";
}

export async function syncReservationStatus(reservation, now = new Date()) {
  if (!reservation) return null;

  const paymentSummary = await getPaymentSummary(reservation);
  const lifecycleStatus = getReservationLifecycleStatus(reservation, now, paymentSummary);
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
