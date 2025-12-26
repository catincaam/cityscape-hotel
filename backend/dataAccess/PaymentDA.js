import Payment from "../entities/Payment.js";

async function createPayment(payload) {
  return await Payment.create(payload);
}

async function getPaymentById(id) {
  return await Payment.findByPk(id);
}

async function getPayments() {
  return await Payment.findAll();
}

async function updatePayment(id, data) {
  const elem = await Payment.findByPk(id);
  if (!elem) return null;
  return await elem.update(data);
}

async function deletePayment(id) {
  const elem = await Payment.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createPayment,
  getPaymentById,
  getPayments,
  updatePayment,
  deletePayment
};
