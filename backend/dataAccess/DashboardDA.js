import Client from "../entities/Client.js";
import ClientType from "../entities/ClientType.js";
import Reservation from "../entities/Reservation.js";
import Room from "../entities/Room.js";
import Hotel from "../entities/Hotel.js";
import Invoice from "../entities/Invoice.js";

async function getDashboardData(clientId) {
  const client = await Client.findByPk(clientId, {
    include: [{ model: ClientType }]
  });

  if (!client) return null;

  const nextReservation = await Reservation.findOne({
    where: { ClientId: clientId },
    order: [["requestedCheckin", "ASC"]],
    include: [{
      model: Room,
      include: [Hotel]
    }]
  });

  const recentActivity = await Invoice.findAll({
    where: { ClientId: clientId },
    limit: 5,
    order: [["createdAt", "DESC"]],
    include: [{
      model: Reservation,
      include: [{
        model: Room,
        include: [Hotel]
      }]
    }]
  });

  return {
    client: {
      nume: client.FirstName + ' ' + client.LastName,
      tip_client: client.TypeClientTip || 'Standard'
    },
    nextReservation: nextReservation
      ? {
          hotel_nume: nextReservation.Room?.Hotel?.name || 'N/A',
          camera_stare: nextReservation.Room?.status || 'N/A',
          data_checkin_solicitat: nextReservation.requestedCheckin,
          data_checkout_solicitat: nextReservation.requestedCheckout
        }
      : null,
    recentActivity: recentActivity.map(f => ({
      hotel_nume: f.Reservation?.Room?.Hotel?.name || 'N/A',
      camera_stare: f.Reservation?.Room?.status || 'N/A',
      total_factura: f.totalAmount || 0
    }))
  };
}

export { getDashboardData };
