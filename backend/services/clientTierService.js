import Client from "../entities/Client.js";
import ClientType from "../entities/ClientType.js";
import Reservation from "../entities/Reservation.js";
import Invoice from "../entities/Invoice.js";

const CLIENT_TIERS = [
  {
    tip: "Standard",
    minCompletedStays: 0,
    discount: 0,
    benefits: "Basic member access and loyalty points."
  },
  {
    tip: "Silver",
    minCompletedStays: 3,
    discount: 5,
    benefits: "Priority recognition and operational benefits for future stays."
  },
  {
    tip: "Gold",
    minCompletedStays: 6,
    discount: 10,
    benefits: "Premium recognition, enhanced loyalty benefits, and preferred service handling."
  }
];

async function ensureClientTypes() {
  await Promise.all(
    CLIENT_TIERS.map((tier) =>
      ClientType.findOrCreate({
        where: { tip: tier.tip },
        defaults: {
          discount: tier.discount,
          benefits: tier.benefits
        }
      })
    )
  );
}

function resolveTier(completedStayCount) {
  return CLIENT_TIERS.reduce((selected, tier) => (
    completedStayCount >= tier.minCompletedStays ? tier : selected
  ), CLIENT_TIERS[0]);
}

export async function calculateCompletedStayCount(clientId) {
  const reservations = await Reservation.findAll({
    where: {
      ClientId: clientId,
      status: "completed"
    },
    attributes: ["ReservationId"]
  });

  if (!reservations.length) return 0;

  const paidFlags = await Promise.all(
    reservations.map(async (reservation) => {
      const invoice = await Invoice.findOne({
        where: { ReservationId: reservation.ReservationId },
        attributes: ["status", "totalAmount"]
      });

      if (!invoice) return false;
      return invoice.status === "paid" || Number(invoice.totalAmount || 0) > 0;
    })
  );

  return paidFlags.filter(Boolean).length;
}

export async function syncClientTier(clientId) {
  await ensureClientTypes();

  const completedStayCount = await calculateCompletedStayCount(clientId);
  const tier = resolveTier(completedStayCount);
  const client = await Client.findByPk(clientId);

  if (client && client.TypeClientTip !== tier.tip) {
    await client.update({ TypeClientTip: tier.tip });
  }

  return {
    tip: tier.tip,
    discount: tier.discount,
    benefits: tier.benefits,
    completedStayCount
  };
}

export function getTierLabel(tip) {
  if (!tip) return "Standard Tier Member";
  return `${tip} Tier Member`;
}
