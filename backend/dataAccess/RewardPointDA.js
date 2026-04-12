import RewardPoint from "../entities/RewardPoint.js";
import { Op } from "sequelize";

async function addPendingPoints({ userId, reservationId, amount, description, availableAt, status = "pending" }) {
  return await RewardPoint.create({
    UserId: userId,
    ReservationId: reservationId,
    amount,
    status,
    description,
    availableAt
  });
}

async function activatePointsForReservation(reservationId) {
  return await RewardPoint.update(
    { status: "active" },
    { where: { ReservationId: reservationId, status: "pending" } }
  );
}

// Auto-activate pending points that are past their availableAt date
async function autoActivatePastPoints(userId) {
  const now = new Date();
  await RewardPoint.update(
    { status: "active" },
    {
      where: {
        UserId: userId,
        status: "pending",
        availableAt: { [Op.lte]: now }
      }
    }
  );
}

async function getUserPoints(userId) {
  // Auto-activate past pending points first
  await autoActivatePastPoints(userId);
  // Return all points for user, grouped by status
  const all = await RewardPoint.findAll({ where: { UserId: userId } });
  return all;
}

async function getUserActivePoints(userId) {
  // Auto-activate past pending points first
  await autoActivatePastPoints(userId);
  const sum = await RewardPoint.sum("amount", {
    where: { UserId: userId, status: "active" }
  });
  return sum || 0;
}

async function getUserPendingPoints(userId) {
  const sum = await RewardPoint.sum("amount", {
    where: { UserId: userId, status: "pending" }
  });
  return sum || 0;
}

export {
  addPendingPoints,
  activatePointsForReservation,
  autoActivatePastPoints,
  getUserPoints,
  getUserActivePoints,
  getUserPendingPoints
};
