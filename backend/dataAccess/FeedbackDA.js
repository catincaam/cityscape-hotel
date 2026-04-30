import Feedback from "../entities/Feedback.js";
import Client from "../entities/Client.js";
import Reservation from "../entities/Reservation.js";

async function createFeedback(payload) {
  return await Feedback.create(payload);
}

async function getFeedbackById(id) {
  return await Feedback.findByPk(id);
}

async function getFeedbacks() {
  return await Feedback.findAll({
    include: [
      {
        model: Client,
        attributes: ["ClientId", "FirstName", "LastName", "Email", "profilePicture"],
        required: false
      },
      {
        model: Reservation,
        attributes: ["ReservationId", "requestedCheckin", "requestedCheckout", "status"],
        required: false
      }
    ],
    order: [["createdAt", "DESC"]]
  });
}

async function updateFeedback(id, data) {
  const elem = await Feedback.findByPk(id);
  if (!elem) return null;
  return await elem.update(data);
}

async function deleteFeedback(id) {
  const elem = await Feedback.findByPk(id);
  if (!elem) return null;
  return await elem.destroy();
}

export {
  createFeedback,
  getFeedbackById,
  getFeedbacks,
  updateFeedback,
  deleteFeedback
};
