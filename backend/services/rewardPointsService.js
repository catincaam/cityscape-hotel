import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";
import Room from "../entities/Room.js";
import RoomTheme from "../entities/RoomTheme.js";
import ConsumedService from "../entities/ConsumedService.js";
import { addPendingPoints, activatePointsForReservation } from "../dataAccess/RewardPointDA.js";

/**
 * Calculate reward points for a completed reservation
 * Formula: (Room price * nights * 0.1) + (nr people * 10) + (services total * 0.05)
 * 
 * @param {number} reservationId - The reservation ID
 * @returns {object} - { points, breakdown }
 */
export async function calculateReservationPoints(reservationId) {
  try {
    // Get reservation details
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        {
          model: RoomReservation,
          as: "RoomReservations",
          include: [
            {
              model: Room,
              include: [
                {
                  model: RoomTheme
                }
              ]
            }
          ]
        }
      ]
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    let roomPoints = 0;
    let peoplePoints = 0;
    let servicePoints = 0;

    // 1. Room & Nights calculation
    const nights = Math.ceil(
      (new Date(reservation.requestedCheckout) - new Date(reservation.requestedCheckin)) / (1000 * 60 * 60 * 24)
    );

    if (reservation.RoomReservations && reservation.RoomReservations.length > 0) {
      for (const roomRes of reservation.RoomReservations) {
        if (roomRes.Room?.RoomTheme?.basePrice) {
          const basePrice = parseFloat(roomRes.Room.RoomTheme.basePrice);
          roomPoints += Math.floor(basePrice * nights * 0.1); // 10% of room cost for each night
        }
      }
    }

    // 2. People bonus
    if (reservation.nrPeople) {
      peoplePoints = reservation.nrPeople * 10; // 10 points per person
    }

    // 3. Services calculation
    const services = await ConsumedService.findAll({
      where: { ReservationId: reservationId }
    });

    if (services && services.length > 0) {
      for (const service of services) {
        const serviceTotal = parseFloat(service.price) * (service.quantity || 1);
        servicePoints += Math.floor(serviceTotal * 0.05); // 5% of service cost
      }
    }

    const totalPoints = roomPoints + peoplePoints + servicePoints;

    return {
      points: Math.max(totalPoints, 10), // Minimum 10 points per reservation
      breakdown: {
        roomPoints,
        peoplePoints,
        servicePoints,
        nights,
        nrPeople: reservation.nrPeople
      }
    };

  } catch (error) {
    console.error("Error calculating reward points:", error);
    throw error;
  }
}

/**
 * Award points to user after reservation is completed and paid
 * 
 * @param {number} reservationId - The reservation ID
 * @param {number} clientId - The client/user ID
 * @returns {object} - Created RewardPoint record
 */
export async function awardPointsForCompletedReservation(reservationId, clientId) {
  try {
    const { points, breakdown } = await calculateReservationPoints(reservationId);

    const description = `Puncte din rezervare #${reservationId}: ${breakdown.nights} nopti x ${breakdown.nrPeople} persoane + servicii`;

    // Add as ACTIVE points immediately (reservation was completed and paid)
    const rewardPoint = await addPendingPoints({
      userId: clientId,
      reservationId: reservationId,
      amount: points,
      status: "active", // Directly active since reservation is completed
      description,
      availableAt: new Date() // Available immediately
    });

    console.log(`✅ Awarded ${points} points to user ${clientId} for completed reservation #${reservationId}`);

    return {
      success: true,
      points,
      breakdown,
      rewardPointId: rewardPoint.RewardPointId
    };

  } catch (error) {
    console.error("Error awarding points:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deduct points when user uses them to pay for reservation
 * 
 * @param {number} clientId - The client/user ID
 * @param {number} pointsToUse - Number of points to use
 * @param {number} reservationId - The reservation they're using points for
 * @returns {object} - { success, pointsUsed, pointsRemaining }
 */
export async function useRewardPoints(clientId, pointsToUse, reservationId) {
  try {
    // This would be handled in RewardPointDA
    // Create a "redeemed" entry for the points used
    
    const description = `Puncte folosite pentru rezervare #${reservationId}`;

    const deduction = await addPendingPoints({
      userId: clientId,
      reservationId: reservationId,
      amount: -pointsToUse, // Negative amount for deduction
      status: "redeemed",
      description
    });

    console.log(`✅ Deducted ${pointsToUse} points from user ${clientId}`);

    return {
      success: true,
      pointsUsed: pointsToUse,
      deductionId: deduction.RewardPointId
    };

  } catch (error) {
    console.error("Error using points:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
