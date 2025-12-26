import Invoice from "../entities/Invoice.js";
import Payment from "../entities/Payment.js";
import ConsumedService from "../entities/ConsumedService.js";

async function createInvoice(payload) {
  // Calculează suma serviciilor suplimentare pentru această factură
  let servicesTotal = 0;
  if (payload.InvoiceId) {
    const consumed = await ConsumedService.findAll({ where: { InvoiceId: payload.InvoiceId } });
    servicesTotal = consumed.reduce((sum, cs) => sum + (parseFloat(cs.paidPrice || 0) * (cs.quantity || 1)), 0);
  }
  // Adaugă la totalAmount dacă există
  if (payload.totalAmount !== undefined) {
    payload.totalAmount = parseFloat(payload.totalAmount) + servicesTotal;
  }
  return await Invoice.create(payload);
}

async function getInvoiceById(id) {
  return await Invoice.findByPk(id, {
    include: [{
      model: Payment,
      as: "payments"
    }]
  });
}

async function getInvoices() {
  return await Invoice.findAll({
    include: [{
      model: Payment,
      as: "payments"
    }]
  });
}

async function getInvoiceByReservationId(reservationId) {
  return await Invoice.findOne({
    where: { ReservationId: reservationId },
    include: [{
      model: Payment,
      as: "payments"
    }]
  });
}

async function updateInvoice(id, data) {
  const elem = await Invoice.findByPk(id);
  if (!elem) return null;
  // Calculează suma serviciilor suplimentare pentru această factură
  const consumed = await ConsumedService.findAll({ where: { InvoiceId: id } });
  const servicesTotal = consumed.reduce((sum, cs) => sum + (parseFloat(cs.paidPrice || 0) * (cs.quantity || 1)), 0);
  if (data.totalAmount !== undefined) {
    data.totalAmount = parseFloat(data.totalAmount) + servicesTotal;
  }
  return await elem.update(data);
}

async function deleteInvoice(id) {
  const elem = await Invoice.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

// Calcul sumă rămasă de plată
async function getRemainingAmount(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) return null;
  
  const totalPaid = invoice.payments.reduce((sum, payment) => {
    return sum + parseFloat(payment.amount);
  }, 0);
  
  return parseFloat(invoice.totalAmount) - totalPaid;
}

export {
  createInvoice,
  getInvoiceById,
  getInvoices,
  getInvoiceByReservationId,
  updateInvoice,
  deleteInvoice,
  getRemainingAmount
};
