
// Endpoint pentru admin: toate rezervările cu user, temă, date, preț, status, avatar
import Client from "../entities/Client.js";
import RoomTheme from "../entities/RoomTheme.js";
import Room from "../entities/Room.js";
import Reservation from "../entities/Reservation.js";
import RoomReservation from "../entities/RoomReservation.js";
import ReservationService from "../entities/ReservationService.js";
import Service from "../entities/Service.js";
import RewardPoint from "../entities/RewardPoint.js";
import Reward from "../entities/Reward.js";
import express from "express";
import { Op } from "sequelize";
import { createInvoice, getInvoiceByReservationId, getRemainingAmount } from "../dataAccess/InvoiceDA.js";
import { createPayment } from "../dataAccess/PaymentDA.js";
import { createReservation, getReservationById } from "../dataAccess/ReservationDA.js";
import { addServiceToReservation } from "../dataAccess/ReservationServiceDA.js";
import { getServiceById } from "../dataAccess/ServiceDA.js";
import { createRoomReservation } from "../dataAccess/RoomReservationDA.js";
import { sendReservationConfirmation } from "../services/emailService.js";
import { publicAssetUrl } from "../utils/publicUrl.js";
import {
  isFutureExpiry,
  isPositiveInteger,
  isPositiveNumber,
  isValidCardNumber,
  isValidCvc,
  isValidDateRange
} from "../utils/validators.js";

const bookingRouter = express.Router();

const ACTIVE_SERVICE_STATUSES = new Set(["activ", "active", "available", "disponibil"]);

function isServiceBookable(service) {
  if (!service) return false;

  const normalizedStatus = String(service.status || "activ").trim().toLowerCase();
  const bookableOnline = service.bookableOnline;
  const isBookableOnline =
    bookableOnline === undefined ||
    bookableOnline === null ||
    bookableOnline === true ||
    bookableOnline === 1 ||
    String(bookableOnline).toLowerCase() === "true";

  return ACTIVE_SERVICE_STATUSES.has(normalizedStatus) && isBookableOnline;
}

// GET /api/admin/bookings
bookingRouter.get("/admin/bookings", async (req, res) => {
  try {
    const invoiceModel = (await import("../entities/Invoice.js")).default;
    const Payment = (await import("../entities/Payment.js")).default;
    
    // Query Reservations WITH required:false to include ALL reservations
    const reservations = await Reservation.findAll({
      include: [
        {
          model: Client,
          attributes: ["ClientId", "FirstName", "LastName", "Email", "TypeClientTip", "profilePicture"]
        },
        {
          model: RoomReservation,
          required: false,  // LEFT JOIN - include even without RoomReservation
          include: [
            {
              model: Room,
              required: false,
              include: [
                {
                  model: RoomTheme,
                  required: false,
                  attributes: ["name", "city", "theme", "showcaseImage"]
                }
              ]
            }
          ]
        },
        {
          model: invoiceModel,
          required: false,
          attributes: ["InvoiceId", "issueDate", "totalAmount", "status"],
          include: [
            {
              model: Payment,
              required: false,
              attributes: ["id", "amount", "paymentDate", "paymentType", "createdAt"],
              as: "payments"
            }
          ]
        }
      ],
      order: [['ReservationId', 'DESC']]
    });

    // Map all bookings except ghost (for total)
    const reservationIds = reservations.map((reservation) => reservation.ReservationId);
    const reservationServices = reservationIds.length
      ? await ReservationService.findAll({
          where: { ReservationId: { [Op.in]: reservationIds } },
          include: [{ model: Service, required: false }]
        })
      : [];
    const servicesByReservation = reservationServices.reduce((map, item) => {
      const key = String(item.ReservationId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
      return map;
    }, new Map());

    const rewardRedemptions = reservationIds.length
      ? await RewardPoint.findAll({
          where: {
            ReservationId: { [Op.in]: reservationIds },
            amount: { [Op.lt]: 0 },
            description: { [Op.like]: "Reward redeemed:%" }
          },
          order: [["createdAt", "DESC"]]
        })
      : [];
    const redeemedTitles = [
      ...new Set(
        rewardRedemptions
          .map((point) => String(point.description || "").replace(/^Reward redeemed:\s*/i, "").trim())
          .filter(Boolean)
      )
    ];
    const rewardRows = redeemedTitles.length
      ? await Reward.findAll({ where: { title: { [Op.in]: redeemedTitles } } })
      : [];
    const rewardsByTitle = new Map(rewardRows.map((reward) => [reward.title, reward]));
    const rewardsByReservation = rewardRedemptions.reduce((map, point) => {
      const key = String(point.ReservationId);
      const title = String(point.description || "").replace(/^Reward redeemed:\s*/i, "").trim() || "Reward";
      const reward = rewardsByTitle.get(title);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        id: point.RewardPointId,
        title,
        description: reward?.desc || "Cityscape reward redeemed for this stay.",
        category: reward?.category || "Reward",
        image: publicAssetUrl(reward?.image),
        points: Math.abs(Number(point.amount || 0)),
        redeemedAt: point.createdAt
      });
      return map;
    }, new Map());

    const allBookings = reservations.map((r, idx) => {
      const client = r.Client || {};
      const roomRes = r.RoomReservations && r.RoomReservations[0];
      const room = roomRes && roomRes.Room;
      const theme = room && room.RoomTheme;
      const invoice = r.Invoice || {};
      const themeName = theme ? (theme.dataValues?.name || theme.name) : "-";
      const showcaseImg = theme ? (theme.dataValues?.showcaseImage || theme.showcaseImage) : null;
      let totalPrice = "-";
      if (invoice.totalAmount) {
        totalPrice = invoice.totalAmount;
      }
      const payments = invoice.payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalAmount = parseFloat(totalPrice) || 0;
      const depositRequired = totalAmount * 0.2;
      const remainingDue = totalAmount - totalPaid;
      let paymentStatus = "pending";
      if (totalPaid >= totalAmount) {
        paymentStatus = "full_payment";
      } else if (totalPaid >= depositRequired && totalPaid > 0) {
        paymentStatus = "deposit_paid";
      } else if (totalPaid > 0 && totalPaid < depositRequired) {
        paymentStatus = "partial_payment";
      }
      const now = new Date();
      const checkinDate = new Date(r.requestedCheckin);
      const hoursUntilCheckin = (checkinDate - now) / (1000 * 60 * 60);
      const checkin = r.requestedCheckin?.toISOString().slice(0, 10) || "N/A";
      const checkout = r.requestedCheckout?.toISOString().slice(0, 10) || "N/A";
      const dates = `${checkin} - ${checkout}`;
      const nights = r.requestedCheckin && r.requestedCheckout
        ? Math.max(1, Math.ceil((new Date(r.requestedCheckout) - new Date(r.requestedCheckin)) / (1000 * 60 * 60 * 24)))
        : 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkoutDate = new Date(r.requestedCheckout);
      checkoutDate.setHours(0, 0, 0, 0);
      const checkinDateNormalized = new Date(r.requestedCheckin);
      checkinDateNormalized.setHours(0, 0, 0, 0);
      let status = "Pending";
      if (r.status === "cancelled") {
        status = "Cancelled";
      } else if (checkoutDate < today) {
        status = "Completed";
      } else if (checkinDateNormalized <= today && today <= checkoutDate) {
        status = "Active";
      } else if (checkinDateNormalized > today) {
        status = "Upcoming";
      }
      const bookingServices = (servicesByReservation.get(String(r.ReservationId)) || []).map((item) => {
        const service = item.Service || {};
        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.unitPrice ?? service.price ?? 0);
        return {
          id: item.ServiceId,
          name: service.name || "Hotel Service",
          description: service.description || "",
          category: service.category || "Service",
          image: publicAssetUrl(service.image),
          quantity,
          unitPrice,
          total: Math.round(quantity * unitPrice * 100) / 100,
          priceType: service.priceType || "per_booking",
          personDetails: item.personDetails || null
        };
      });
      const bookingRewards = rewardsByReservation.get(String(r.ReservationId)) || [];
      return {
        reservationId: r.ReservationId,
        bookingId: `#BK-${String(r.ReservationId).padStart(4, "0")}`,
        guestName: client.FirstName ? `${client.FirstName} ${client.LastName}` : "-",
        guestEmail: client.Email || "",
        guestTier: client.TypeClientTip || "Guest",
        guestAvatar: publicAssetUrl(client.profilePicture) || "/assets/profilePicture.jpg",
        roomTheme: themeName,
        roomName: room?.RoomName || themeName,
        city: theme?.city || "",
        theme: theme?.theme || "",
        roomImage: publicAssetUrl(showcaseImg),
        checkin,
        checkout,
        dates: dates,
        nights,
        guests: r.nrPeople || 1,
        totalPrice: totalPrice,
        totalPaid: Math.round(totalPaid * 100) / 100,
        remainingDue: Math.max(0, Math.round(remainingDue * 100) / 100),
        status: status,
        paymentStatus: paymentStatus,
        depositRequired: Math.round(depositRequired * 100) / 100,
        hoursUntilCheckin: Math.round(hoursUntilCheckin * 100) / 100,
        createdAt: r.createdAt,
        bookingMethod: r.bookingMethod || "online",
        invoiceId: invoice.InvoiceId || null,
        invoiceStatus: invoice.status || "",
        invoiceIssueDate: invoice.issueDate || null,
        payments: payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount || 0),
          paymentDate: payment.paymentDate || payment.createdAt || null
        })),
        services: bookingServices,
        rewards: bookingRewards
      };
    })
    // FILTER: exclude abandoned/ghost bookings. A real booking needs a valid
    // invoice and at least the required 20% deposit paid.
    .filter(b => {
      const price = parseFloat(b.totalPrice);
      const paid = parseFloat(b.totalPaid);
      const depositRequired = parseFloat(b.depositRequired);
      return (
        price &&
        !isNaN(price) &&
        price > 0 &&
        paid >= depositRequired
      );
    });

    // Active stays: the guest is effectively in-house now.
    const activeBookings = allBookings.filter(b => {
      return b.status === "Active";
    });

    // Projected revenue: total contractual value if non-cancelled stays complete.
    const projectedRevenue = allBookings.reduce((sum, b) => {
      if (b.status?.toLowerCase() === "cancelled") return sum;
      return sum + (parseFloat(b.totalPrice) || 0);
    }, 0);

    // Cash received: recognize money only once the stay has started.
    // This avoids treating deposits for future stays as earned hotel revenue.
    const totalCashReceived = allBookings.reduce((sum, b) => {
      if (b.status?.toLowerCase() === 'cancelled') return sum;
      const paid = parseFloat(b.totalPaid);
      if (!["active", "completed"].includes(b.status?.toLowerCase())) return sum;
      if (!paid) return sum;
      return sum + paid;
    }, 0);

    res.json({
      allBookings: JSON.parse(JSON.stringify(allBookings)),
      activeBookings: JSON.parse(JSON.stringify(activeBookings)),
      stats: {
        totalBookings: allBookings.length,
        activeStays: activeBookings.length,
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        cashReceived: Math.round(totalCashReceived * 100) / 100
      },
      totalCashReceived: Math.round(totalCashReceived * 100) / 100
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* CREATE COMPLETE BOOKING - Rezervare + Factură + Plată inițială */
bookingRouter.post("/complete", async (req, res) => {
  try {

    const {
      reservationDate,
      requestedCheckin,
      requestedCheckout,
      bookingMethod,
      ClientId,
      RoomId,
      nrPeople,
      totalAmount,
      paymentAmount,
      paymentType,
      cardNumber,
      cardExpiry,
      cardCVC,
      services 
    } = req.body;

    // Validare: nu permite rezervare fără cameră
    if (!RoomId) {
      return res.status(400).json({ message: "RoomId is required. You must select a room for the reservation." });
    }

    if (!ClientId) {
      return res.status(400).json({ message: "ClientId is required." });
    }

    if (!isValidDateRange(requestedCheckin, requestedCheckout)) {
      return res.status(400).json({ message: "Check-in must be before check-out." });
    }

    if (!isPositiveInteger(nrPeople)) {
      return res.status(400).json({ message: "Number of guests must be a positive number." });
    }

    if (!isPositiveNumber(totalAmount) || !isPositiveNumber(paymentAmount)) {
      return res.status(400).json({ message: "Payment values must be positive numbers." });
    }

    const client = await Client.findByPk(ClientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    const room = await Room.findByPk(RoomId, { include: [RoomTheme] });
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    const maxGuests = Number(room.RoomTheme?.maxGuests || 1);
    if (Number(nrPeople) > maxGuests) {
      return res.status(400).json({ message: `This room allows a maximum of ${maxGuests} guest${maxGuests === 1 ? "" : "s"}.` });
    }

    const overlappingRoomReservations = await RoomReservation.findAll({
      where: { RoomId },
      attributes: ["ReservationId"]
    });
    const overlappingReservationIds = overlappingRoomReservations.map((item) => item.ReservationId);

    if (overlappingReservationIds.length > 0) {
      const existingReservation = await Reservation.findOne({
        where: {
          ReservationId: { [Op.in]: overlappingReservationIds },
          status: { [Op.notIn]: ["cancelled", "pending"] },
          requestedCheckin: { [Op.lt]: requestedCheckout },
          requestedCheckout: { [Op.gt]: requestedCheckin }
        }
      });

      if (existingReservation) {
        return res.status(409).json({
          message: "This room is no longer available for the selected dates. Please choose another room."
        });
      }
    }

    // ===== STEP 1: VALIDATE PAYMENT FIRST (Mock validation) =====
    // Mock card validation
    if (!cardNumber || !cardExpiry || !cardCVC) {
      return res.status(400).json({ message: "Card details are required" });
    }

    if (!isValidCardNumber(cardNumber)) {
      return res.status(400).json({ message: "Invalid card number format" });
    }

    if (!isFutureExpiry(cardExpiry)) {
      return res.status(400).json({ message: "Invalid or expired card date. Use MM/YY." });
    }

    if (!isValidCvc(cardCVC)) {
      return res.status(400).json({ message: "Invalid CVC format" });
    }

    // ===== STEP 2: IF PAYMENT VALID - CREATE RESERVATION =====
    
    // VALIDARE: Minim 20% deposit OBLIGATORIU
    const minimumDeposit = totalAmount * 0.2;
    if (paymentAmount < minimumDeposit) {
      return res.status(400).json({ 
        message: `Minimum 20% deposit required. You must pay at least €${minimumDeposit.toFixed(2)} out of €${totalAmount}`,
        minimumRequired: minimumDeposit,
        totalAmount: totalAmount
      });
    }

    const selectedServiceItems = [];
    if (services && Object.keys(services).length > 0) {
      for (const [serviceId, quantity] of Object.entries(services)) {
        const normalizedQuantity = Number(quantity);
        if (normalizedQuantity > 0) {
          if (!isPositiveInteger(normalizedQuantity)) {
            return res.status(400).json({ message: "Service quantity must be a positive number." });
          }

          const serviceData = await getServiceById(serviceId);
          if (!isServiceBookable(serviceData)) {
            return res.status(400).json({ message: "Selected service is not available." });
          }

          if (serviceData.priceType === "per_person" && normalizedQuantity > Number(nrPeople)) {
            return res.status(400).json({ message: "Per-person services cannot exceed the number of guests." });
          }

          selectedServiceItems.push({
            ServiceId: parseInt(serviceId),
            quantity: normalizedQuantity,
            unitPrice: serviceData?.price || 0
          });
        }
      }
    }

    const reservation = await createReservation({
      reservationDate: reservationDate || new Date(),
      requestedCheckin,
      requestedCheckout,
      bookingMethod: bookingMethod || "online",
      nrPeople: nrPeople || 1,
      ClientId
    });

    await createRoomReservation({
      ReservationId: reservation.ReservationId,
      RoomId: RoomId
    });

    const reservationServices = [];
    for (const serviceItem of selectedServiceItems) {
      const resService = await addServiceToReservation({
        ReservationId: reservation.ReservationId,
        ...serviceItem
      });
      reservationServices.push(resService);
    }

    const invoice = await createInvoice({
      issueDate: new Date(),
      totalAmount,
      status: paymentAmount >= totalAmount ? "paid" : "partial",
      ReservationId: reservation.ReservationId
    });

    const payment = await createPayment({
      amount: paymentAmount,
      paymentDate: new Date(),
      InvoiceId: invoice.InvoiceId,
      paymentType: paymentType || (paymentAmount >= totalAmount ? "full" : "partial")
    });

    // Actualizează statusul rezervării după payment
    const newStatus = paymentAmount >= totalAmount ? "paid" : "partial";
    await reservation.update({ status: newStatus });

    let emailResult = { success: false, error: "Email was not attempted." };
    try {
      const [client, bookedRoom] = await Promise.all([
        Client.findByPk(ClientId),
        Room.findByPk(RoomId)
      ]);
      const bookedTheme = bookedRoom?.RoomThemeId
        ? await RoomTheme.findByPk(bookedRoom.RoomThemeId)
        : null;

      emailResult = await sendReservationConfirmation({
        client,
        reservation,
        room: bookedRoom
          ? { ...bookedRoom.toJSON(), RoomTheme: bookedTheme?.toJSON() }
          : null,
        invoice,
        payment,
        remainingAmount: totalAmount - paymentAmount
      });

      if (!emailResult.success) {
        console.warn("[BOOKING EMAIL] Confirmation email not sent:", emailResult.error);
      }
    } catch (emailError) {
      emailResult = { success: false, error: emailError.message };
      console.error("[BOOKING EMAIL ERROR]", emailError);
    }

    res.status(201).json({
      reservation,
      reservationServices,
      invoice,
      payment,
      remainingAmount: totalAmount - paymentAmount,
      email: {
        sent: Boolean(emailResult.success),
        error: emailResult.success ? undefined : emailResult.error
      },
      message: "Booking confirmed! Reservation saved."
    });

  } catch (err) {
    console.error("[BOOKING ERROR]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* GET BOOKING SUMMARY - pentru pagina de confirmare */
bookingRouter.get("/summary/:reservationId", async (req, res) => {
  try {
    const reservationId = req.params.reservationId;
    
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const invoice = await getInvoiceByReservationId(reservationId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const remainingAmount = await getRemainingAmount(invoice.InvoiceId);

    res.status(200).json({
      reservation,
      invoice,
      payments: invoice.payments,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      remainingAmount,
      isPaid: remainingAmount <= 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ADD ADDITIONAL PAYMENT - pentru plăți ulterioare */
bookingRouter.post("/payment/:invoiceId", async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, paymentType } = req.body;

    const invoice = await getInvoiceByReservationId(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const remainingAmount = await getRemainingAmount(invoiceId);
    
    if (amount > remainingAmount) {
      return res.status(400).json({ 
        message: "Payment amount exceeds remaining balance",
        remainingAmount
      });
    }

    const payment = await createPayment({
      amount,
      paymentDate: new Date(),
      InvoiceId: invoiceId,
      paymentType: paymentType || "additional"
    });

    // Update invoice status if fully paid
    const newRemainingAmount = remainingAmount - amount;
    if (newRemainingAmount <= 0) {
      await updateInvoice(invoiceId, { status: "paid" });
    }

    res.status(201).json({
      payment,
      remainingAmount: newRemainingAmount,
      isPaid: newRemainingAmount <= 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* GET RESERVATION BY ID - pentru adăugare servicii */
bookingRouter.get("/reservation/:reservationId", async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found with this ID" });
    }

    const invoice = await getInvoiceByReservationId(reservation.ReservationId);
    const remainingAmount = invoice ? await getRemainingAmount(invoice.InvoiceId) : 0;

    res.status(200).json({
      reservation,
      invoice,
      remainingAmount,
      canAddServices: remainingAmount >= 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default bookingRouter;
