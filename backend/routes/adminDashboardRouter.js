import express from "express";
import axios from "axios";
import { Op } from "sequelize";
import Reservation from "../entities/Reservation.js";
import Room from "../entities/Room.js";
import Feedback from "../entities/Feedback.js";
import ConsumedService from "../entities/ConsumedService.js";
import Client from "../entities/Client.js";
import Service from "../entities/Service.js";
import Invoice from "../entities/Invoice.js";
import Payment from "../entities/Payment.js";
import RoomReservation from "../entities/RoomReservation.js";
import RoomTheme from "../entities/RoomTheme.js";
import ReservationService from "../entities/ReservationService.js";
import { seedDemoData } from "../services/demoDataSeeder.js";
import db from "../dbConfig.js";
import { importCatalogData } from "../services/catalogTransferService.js";
import { syncReservationStatuses } from "../services/reservationStatusService.js";

const dashboardRouter = express.Router();

function validateDemoSeedToken(req, res) {
  const configuredToken = process.env.DEMO_SEED_TOKEN;
  const providedToken = req.headers["x-demo-seed-token"];

  if (!configuredToken) {
    res.status(404).json({ message: "Demo seeding is disabled." });
    return false;
  }

  if (providedToken !== configuredToken) {
    res.status(401).json({ message: "Invalid demo seed token." });
    return false;
  }

  return true;
}

dashboardRouter.post("/seed-demo-data", async (req, res) => {
  try {
    if (!validateDemoSeedToken(req, res)) return;

    const summary = await seedDemoData();
    res.status(201).json({
      message: "Demo data seeded successfully.",
      summary
    });
  } catch (err) {
    console.error("Demo data seed error:", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

dashboardRouter.post("/import-catalog", async (req, res) => {
  try {
    if (!validateDemoSeedToken(req, res)) return;

    const summary = await db.transaction((transaction) =>
      importCatalogData(req.body, transaction)
    );

    res.status(201).json({
      message: "Catalog imported successfully.",
      summary
    });
  } catch (err) {
    console.error("Catalog import error:", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

function getDaysBetween(start, end) {
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

function clampDate(date, min, max) {
  return new Date(Math.min(Math.max(date.getTime(), min.getTime()), max.getTime()));
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value) {
  return Number.parseFloat(value || 0) || 0;
}

function linearForecast(values, horizon = 7, minimum = 0, maximum = null) {
  const cleanValues = values.map(toNumber);
  if (!cleanValues.length) {
    return Array.from({ length: horizon }, () => minimum);
  }

  if (cleanValues.length === 1) {
    const baseline = Math.max(minimum, cleanValues[0]);
    return Array.from({ length: horizon }, () => baseline);
  }

  const count = cleanValues.length;
  const xs = Array.from({ length: count }, (_, index) => index);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / count;
  const meanY = cleanValues.reduce((sum, value) => sum + value, 0) / count;
  const denominator = xs.reduce((sum, value) => sum + ((value - meanX) ** 2), 0) || 1;
  const slope = xs.reduce((sum, value, index) => (
    sum + ((value - meanX) * (cleanValues[index] - meanY))
  ), 0) / denominator;
  const intercept = meanY - (slope * meanX);
  const recentValues = cleanValues.slice(-Math.min(7, count));
  const recentAverage = recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length;

  return Array.from({ length: horizon }, (_, stepIndex) => {
    const linearValue = intercept + (slope * (count + stepIndex));
    let value = (linearValue * 0.65) + (recentAverage * 0.35);
    value = Math.max(minimum, value);
    if (maximum !== null) value = Math.min(maximum, value);
    return value;
  });
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function buildLocalPredictions(payload) {
  const history = payload.history || [];
  const horizon = Number(payload.horizon || 7);
  const lastHistoryDate = history.length ? new Date(history[history.length - 1].date) : new Date();
  const labels = Array.from({ length: horizon }, (_, index) => formatDateKey(addDays(lastHistoryDate, index + 1)));

  const bookingValues = linearForecast(history.map((row) => row.bookings), horizon, 0);
  const revenueValues = linearForecast(history.map((row) => row.revenue), horizon, 0);
  const occupancyValues = linearForecast(history.map((row) => row.occupancyRate), horizon, 0, 100);

  const bookingForecast = labels.map((date, index) => ({
    date,
    value: Math.round(bookingValues[index])
  }));
  const revenueForecast = labels.map((date, index) => ({
    date,
    value: Math.round(revenueValues[index] * 100) / 100
  }));
  const occupancyForecast = labels.map((date, index) => ({
    date,
    value: Math.round(occupancyValues[index])
  }));
  const averageBookingForecast = bookingForecast.length
    ? bookingForecast.reduce((sum, item) => sum + item.value, 0) / bookingForecast.length
    : 0;
  const lowOccupancyDay = occupancyForecast.find((item) => item.value < 45);

  return {
    model: "linear-regression-baseline",
    horizonDays: horizon,
    bookingForecast,
    revenueForecast,
    revenueTotal: Math.round(revenueForecast.reduce((sum, item) => sum + item.value, 0) * 100) / 100,
    occupancyForecast,
    insights: {
      bookingTrend: bookingForecast.at(-1)?.value >= averageBookingForecast ? "up" : "down",
      lowOccupancyDate: lowOccupancyDay?.date || null,
      lowOccupancyValue: lowOccupancyDay?.value || null
    }
  };
}

function isRealBooking(reservation) {
  const invoice = reservation.Invoice;
  if (!invoice) return false;
  const total = toNumber(invoice.totalAmount);
  const paid = (invoice.payments || []).reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  return total > 0 && paid >= total * 0.2;
}

function getBusinessStatus(reservation, now = new Date()) {
  if (reservation.status === "cancelled") return "cancelled";
  const checkin = new Date(reservation.requestedCheckin);
  const checkout = new Date(reservation.requestedCheckout);
  if (checkin <= now && now <= checkout) return "active";
  if (checkout < now) return "completed";
  return "upcoming";
}

async function getDashboardReservations() {
  const reservations = await Reservation.findAll({
    include: [
      {
        model: Client,
        attributes: ["ClientId", "FirstName", "LastName", "Email", "profilePicture"],
        required: false
      },
      {
        model: Invoice,
        as: "Invoice",
        required: false,
        include: [
          {
            model: Payment,
            as: "payments",
            required: false
          }
        ]
      },
      {
        model: RoomReservation,
        required: false,
        include: [
          {
            model: Room,
            required: false,
            include: [
              {
                model: RoomTheme,
                required: false
              }
            ]
          }
        ]
      }
    ],
    order: [["requestedCheckin", "ASC"]]
  });
  await syncReservationStatuses(reservations);
  return reservations;
}

// Helper: Get date range based on period
function getDateRange(period) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  
  switch(period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisWeek':
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastWeek':
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - now.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 7);
      start.setTime(lastWeekStart.getTime());
      end.setTime(lastWeekEnd.getTime());
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastMonth':
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      end.setDate(0); // Last day of previous month
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisQuarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      end.setMonth(quarter * 3 + 2);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastQuarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const lastQ = currentQuarter === 0 ? 3 : currentQuarter - 1;
      start.setMonth(lastQ * 3);
      start.setDate(1);
      end.setMonth(lastQ * 3 + 2);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisYear':
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastYear':
      start.setFullYear(now.getFullYear() - 1);
      start.setMonth(0);
      start.setDate(1);
      end.setFullYear(now.getFullYear() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }
  
  return { start, end };
}

dashboardRouter.get("/overview", async (req, res) => {
  try {
    const period = req.query.period || "thisMonth";
    const { start, end } = getDateRange(period);
    const now = new Date();
    const periodDays = getDaysBetween(start, end);
    const previousEnd = new Date(start);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - periodDays);

    const [reservationsRaw, totalRooms, services, feedbacks] = await Promise.all([
      getDashboardReservations(),
      Room.count(),
      Service.findAll({ attributes: ["ServiceId", "name", "category"] }),
      Feedback.findAll({
        include: [
          { model: Client, attributes: ["FirstName", "LastName", "profilePicture"], required: false },
          { model: Reservation, attributes: ["ReservationId"], required: false }
        ],
        order: [["submissionDate", "DESC"], ["createdAt", "DESC"]]
      })
    ]);

    const reservations = reservationsRaw.filter(isRealBooking);
    const periodReservations = reservations.filter((reservation) => {
      const checkin = new Date(reservation.requestedCheckin);
      const checkout = new Date(reservation.requestedCheckout);
      return overlaps(checkin, checkout, start, end);
    });
    const previousReservations = reservations.filter((reservation) => {
      const checkin = new Date(reservation.requestedCheckin);
      const checkout = new Date(reservation.requestedCheckout);
      return overlaps(checkin, checkout, previousStart, previousEnd);
    });

    const getRecognizedRevenue = (list) => list.reduce((sum, reservation) => {
      const status = getBusinessStatus(reservation, now);
      if (!["active", "completed"].includes(status)) return sum;
      if (reservation.status === "cancelled") return sum;
      return sum + (reservation.Invoice?.payments || []).reduce((paid, payment) => paid + toNumber(payment.amount), 0);
    }, 0);

    const revenue = getRecognizedRevenue(periodReservations);
    const previousRevenue = getRecognizedRevenue(previousReservations);
    const invoiceValues = periodReservations
      .filter((reservation) => reservation.status !== "cancelled")
      .map((reservation) => toNumber(reservation.Invoice?.totalAmount))
      .filter(Boolean);
    const previousInvoiceValues = previousReservations
      .filter((reservation) => reservation.status !== "cancelled")
      .map((reservation) => toNumber(reservation.Invoice?.totalAmount))
      .filter(Boolean);
    const avgBookingValue = invoiceValues.length
      ? Math.round(invoiceValues.reduce((sum, value) => sum + value, 0) / invoiceValues.length)
      : 0;
    const previousAvgBookingValue = previousInvoiceValues.length
      ? Math.round(previousInvoiceValues.reduce((sum, value) => sum + value, 0) / previousInvoiceValues.length)
      : 0;

    const getOccupiedRoomNights = (list, rangeStart, rangeEnd) => list.reduce((sum, reservation) => {
      if (reservation.status === "cancelled") return sum;
      const checkin = new Date(reservation.requestedCheckin);
      const checkout = new Date(reservation.requestedCheckout);
      if (!overlaps(checkin, checkout, rangeStart, rangeEnd)) return sum;
      const overlapStart = clampDate(checkin, rangeStart, rangeEnd);
      const overlapEnd = clampDate(checkout, rangeStart, rangeEnd);
      const roomCount = Math.max(1, reservation.RoomReservations?.length || 1);
      return sum + getDaysBetween(overlapStart, overlapEnd) * roomCount;
    }, 0);

    const occupiedRoomNights = getOccupiedRoomNights(periodReservations, start, end);
    const previousOccupiedRoomNights = getOccupiedRoomNights(previousReservations, previousStart, previousEnd);
    const capacityRoomNights = Math.max(1, totalRooms * periodDays);
    const previousCapacityRoomNights = Math.max(1, totalRooms * periodDays);
    const occupancyRate = Math.round((occupiedRoomNights / capacityRoomNights) * 100);
    const previousOccupancyRate = Math.round((previousOccupiedRoomNights / previousCapacityRoomNights) * 100);

    const periodFeedbacks = feedbacks.filter((feedback) => {
      const created = new Date(feedback.createdAt);
      return created >= start && created <= end;
    });
    const previousFeedbacks = feedbacks.filter((feedback) => {
      const created = new Date(feedback.createdAt);
      return created >= previousStart && created < previousEnd;
    });
    const averageRating = (list) => {
      const ratings = list.map((feedback) => Number(feedback.overall || feedback.service || 0)).filter(Boolean);
      return ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
    };
    const satisfaction = Number(averageRating(periodFeedbacks).toFixed(1));
    const previousSatisfaction = Number(averageRating(previousFeedbacks).toFixed(1));

    const bookingTrend = [];
    const trendStart = new Date(end);
    trendStart.setDate(end.getDate() - 6);
    trendStart.setHours(0, 0, 0, 0);
    for (let index = 0; index < 7; index += 1) {
      const dayStart = new Date(trendStart);
      dayStart.setDate(trendStart.getDate() + index);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const occupied = getOccupiedRoomNights(periodReservations, dayStart, dayEnd);
      bookingTrend.push({
        label: formatShortDate(dayStart),
        date: formatDateKey(dayStart),
        bookings: periodReservations.filter((reservation) => {
          const checkin = new Date(reservation.requestedCheckin);
          return checkin >= dayStart && checkin < dayEnd;
        }).length,
        occupancy: Math.round((occupied / Math.max(1, totalRooms)) * 100)
      });
    }

    const revenueByCityMap = {};
    periodReservations.forEach((reservation) => {
      if (reservation.status === "cancelled") return;
      const amount = toNumber(reservation.Invoice?.totalAmount);
      const roomTheme = reservation.RoomReservations?.[0]?.Room?.RoomTheme;
      const city = roomTheme?.city || "Unknown";
      revenueByCityMap[city] = (revenueByCityMap[city] || 0) + amount;
    });
    const revenueByCity = Object.entries(revenueByCityMap)
      .map(([city, amount]) => ({ city, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const heatmapStart = new Date(end);
    heatmapStart.setDate(end.getDate() - 34);
    heatmapStart.setHours(0, 0, 0, 0);
    const occupancyHeatmap = [];
    for (let index = 0; index < 35; index += 1) {
      const dayStart = new Date(heatmapStart);
      dayStart.setDate(heatmapStart.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const occupied = getOccupiedRoomNights(reservations, dayStart, dayEnd);
      occupancyHeatmap.push({
        date: formatDateKey(dayStart),
        value: Math.round((occupied / Math.max(1, totalRooms)) * 100)
      });
    }

    const periodReservationIds = periodReservations.map((reservation) => reservation.ReservationId);
    const reservationServices = periodReservationIds.length
      ? await ReservationService.findAll({
          where: { ReservationId: { [Op.in]: periodReservationIds } },
          include: [{ model: Service, required: false }]
        })
      : [];
    const serviceMap = {};
    reservationServices.forEach((reservationService) => {
      const service = reservationService.Service;
      const category = service?.category || "Other";
      const quantity = Number(reservationService.quantity || 1);
      serviceMap[category] = (serviceMap[category] || 0) + quantity;
    });
    if (!Object.keys(serviceMap).length) {
      services.forEach((service) => {
        serviceMap[service.category || "Other"] = serviceMap[service.category || "Other"] || 0;
      });
    }
    const serviceTotal = Object.values(serviceMap).reduce((sum, value) => sum + value, 0);
    const serviceUsage = Object.entries(serviceMap)
      .map(([category, count]) => ({
        category,
        count,
        percentage: serviceTotal ? Math.round((count / serviceTotal) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentFeedback = feedbacks.slice(0, 3).map((feedback) => ({
      id: feedback.id,
      guestName: feedback.Client ? `${feedback.Client.FirstName} ${feedback.Client.LastName}` : "Guest",
      avatar: feedback.Client?.profilePicture || null,
      rating: Number(feedback.overall || feedback.service || 0),
      comment: feedback.comment || "No written comment yet.",
      createdAt: feedback.createdAt,
      submissionDate: feedback.submissionDate
    }));

    const pctChange = (current, previous) => {
      if (!previous && current) return 100;
      if (!previous) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
      period,
      kpis: {
        revenue: Math.round(revenue),
        revenueChange: pctChange(revenue, previousRevenue),
        occupancyRate,
        occupancyChange: occupancyRate - previousOccupancyRate,
        avgBookingValue,
        avgBookingChange: pctChange(avgBookingValue, previousAvgBookingValue),
        satisfaction,
        satisfactionChange: Number((satisfaction - previousSatisfaction).toFixed(1))
      },
      bookingTrend,
      revenueByCity,
      occupancyHeatmap,
      serviceUsage,
      recentFeedback,
      predictiveTodo: true
    });
  } catch (err) {
    console.error("[DASHBOARD OVERVIEW ERROR]", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

dashboardRouter.get("/predictions", async (req, res) => {
  try {
    const horizon = Number(req.query.horizon || 7);
    const mlUrl = process.env.ML_SERVICE_URL
      || (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:9100/predict" : "");
    const now = new Date();
    const historyStart = new Date(now);
    historyStart.setDate(now.getDate() - 89);
    historyStart.setHours(0, 0, 0, 0);

    const [reservationsRaw, totalRooms] = await Promise.all([
      getDashboardReservations(),
      Room.count()
    ]);
    const reservations = reservationsRaw.filter(isRealBooking);

    const history = [];
    for (let index = 0; index < 90; index += 1) {
      const dayStart = new Date(historyStart);
      dayStart.setDate(historyStart.getDate() + index);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayReservations = reservations.filter((reservation) => {
        const checkin = new Date(reservation.requestedCheckin);
        return checkin >= dayStart && checkin < dayEnd;
      });

      const dayRevenue = dayReservations.reduce((sum, reservation) => {
        if (reservation.status === "cancelled") return sum;
        return sum + toNumber(reservation.Invoice?.totalAmount);
      }, 0);

      const occupiedRoomNights = reservations.reduce((sum, reservation) => {
        if (reservation.status === "cancelled") return sum;
        const checkin = new Date(reservation.requestedCheckin);
        const checkout = new Date(reservation.requestedCheckout);
        if (!overlaps(checkin, checkout, dayStart, dayEnd)) return sum;
        return sum + Math.max(1, reservation.RoomReservations?.length || 1);
      }, 0);

      history.push({
        date: formatDateKey(dayStart),
        bookings: dayReservations.length,
        revenue: Math.round(dayRevenue * 100) / 100,
        occupancyRate: Math.round((occupiedRoomNights / Math.max(1, totalRooms)) * 100)
      });
    }

    const payload = {
      horizon,
      history,
      meta: {
        generatedAt: now.toISOString(),
        totalRooms
      }
    };

    if (mlUrl) {
      try {
        const response = await axios.post(mlUrl, payload, {
          timeout: 5000
        });

        return res.json({
          source: "python-ml-service",
          mlUrl,
          ...response.data
        });
      } catch (mlErr) {
        console.warn("[DASHBOARD PREDICTIONS FALLBACK]", mlErr.message);
      }
    }

    return res.json({
      source: "node-fallback",
      mlUrl: mlUrl || null,
      ...buildLocalPredictions(payload)
    });
  } catch (err) {
    console.error("[DASHBOARD PREDICTIONS ERROR]", err.message);
    res.status(500).json({
      message: "Could not build prediction data",
      detail: err.message,
      source: "dashboard"
    });
  }
});

// KPI: Total Revenue, Average Occupancy, Satisfaction Score, Cash Received
// GET /api/admin/dashboard/kpi?period=thisMonth
dashboardRouter.get("/kpi", async (req, res) => {
    console.log('[DASHBOARD KPI] endpoint hit');
  try {
    const period = req.query.period || 'thisMonth';
    const { start, end } = getDateRange(period);
    
    // Total revenue: sumă totală din facturi (Invoice.totalAmount) - NUMAI PAID
    const Invoice = (await import("../entities/Invoice.js")).default;
    const Payment = (await import("../entities/Payment.js")).default;
    const Reservation = (await import("../entities/Reservation.js")).default;
    
    // Revenue from invoices in date range
    const revenue = await Invoice.sum("totalAmount", {
      where: {
        status: "paid",
        createdAt: { [Op.between]: [start, end] }
      }
    }) || 0;
    
    // Total cash received: sum for ALL completed and fully paid reservations (historic total)
    const allCompletedReservations = await Reservation.findAll({
      where: { status: 'completed' },
      include: [{
        model: Invoice,
        as: 'Invoice',
        required: true,
        where: { status: 'paid' }
      }]
    });

    let cashReceived = 0;
    const includedReservationIds = [];
    for (const reservation of allCompletedReservations) {
      const invoice = reservation.Invoice;
      if (!invoice) continue;
      const payments = await Payment.findAll({ where: { InvoiceId: invoice.InvoiceId } });
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      if (totalPaid >= parseFloat(invoice.totalAmount)) {
        cashReceived += totalPaid;
        includedReservationIds.push(reservation.ReservationId);
      }
    }
    console.log('[DASHBOARD KPI] cashReceived:', cashReceived, 'ReservationIds:', includedReservationIds);
    
    // Grad ocupare: CAMERE OCUPATE ÎN PERIOADA / TOTAL CAMERE
    const totalRooms = await Room.count();
    const occupiedRooms = await Reservation.count({
      distinct: true,
      where: {
        requestedCheckin: { [Op.lte]: end },
        requestedCheckout: { [Op.gte]: start },
        status: { [Op.ne]: 'cancelled' }
      }
    });
    
    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    
    // Satisfacție: scor mediu din feedback în perioada
    const feedbacks = await Feedback.findAll({
      where: {
        serviceRating: { [Op.ne]: null },
        createdAt: { [Op.between]: [start, end] }
      }
    });
    
    let satisfaction = 0;
    if (feedbacks.length) {
      const sum = feedbacks.reduce((acc, f) => acc + (f.service ? Number(f.service) : 0), 0);
      satisfaction = (sum / (feedbacks.length || 1)).toFixed(1);
    }
    
    res.json({
      revenue: Math.round(revenue),
      cashReceived: Math.round(cashReceived),
      occupancy,
      occupiedRooms,
      totalRooms,
      satisfaction,
      period,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('[DASHBOARD KPI ERROR]', err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// Occupancy Trends (7-day view based on period)
dashboardRouter.get("/occupancy-trends", async (req, res) => {
  try {
    const period = req.query.period || 'thisMonth';
    const { start: periodStart } = getDateRange(period);
    
    const days = 7;
    const result = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(periodStart);
      day.setDate(periodStart.getDate() + i);
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));
      
      const count = await Reservation.count({
        where: {
          requestedCheckin: { [Op.lte]: dayEnd },
          requestedCheckout: { [Op.gte]: dayStart },
          status: { [Op.ne]: 'cancelled' }
        }
      });
      
      result.push({
        date: dayStart.toISOString().slice(0, 10),
        occupied: count
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// Revenue by Theme (pie chart)
dashboardRouter.get("/revenue-by-theme", async (req, res) => {
  try {
    const period = req.query.period || 'thisMonth';
    const { start, end } = getDateRange(period);
    
    // Join Invoice -> Reservation -> RoomReservation -> Room -> RoomTheme
    const Invoice = (await import("../entities/Invoice.js")).default;
    const Reservation = (await import("../entities/Reservation.js")).default;
    const RoomReservation = (await import("../entities/RoomReservation.js")).default;
    const Room = (await import("../entities/Room.js")).default;
    const RoomTheme = (await import("../entities/RoomTheme.js")).default;
    const invoices = await Invoice.findAll({
      where: {
        status: 'paid',
        createdAt: { [Op.between]: [start, end] }
      },
      include: [{
        model: Reservation,
        include: [{
          model: RoomReservation,
          include: [{
            model: Room,
            include: [{ model: RoomTheme }]
          }]
        }]
      }]
    });
    const themeRevenue = {};
    let total = 0;
    invoices.forEach(inv => {
      const reservation = inv.Reservation;
      if (!reservation) return;
      const roomRes = reservation.RoomReservations || [];
      roomRes.forEach(rr => {
        const theme = rr.Room?.RoomTheme?.name || "Unknown";
        const amount = Number(inv.totalAmount) || 0;
        themeRevenue[theme] = (themeRevenue[theme] || 0) + amount;
        total += amount;
      });
    });
    const data = Object.entries(themeRevenue).map(([name, value]) => ({ name, value: total ? Math.round((value / total) * 100) : 0 }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// Service Usage Density
dashboardRouter.get("/service-usage", async (req, res) => {
  try {
    const period = req.query.period || 'thisMonth';
    const { start, end } = getDateRange(period);
    
    // Get COMPLETED reservations ONLY within period
    const totalReservations = await Reservation.count({
      where: {
        status: 'completed',
        requestedCheckin: { [Op.between]: [start, end] }
      }
    });

    if (totalReservations === 0) {
      return res.json([]);
    }

    // Get ALL services (even if 0 usage)
    const allServices = await Service.findAll({
      attributes: ['ServiceId', 'name'],
      order: [['ServiceId', 'ASC']]
    });

    // Get completed reservation IDs from period
    const completedIds = await Reservation.findAll({
      attributes: ['ReservationId'],
      where: {
        status: 'completed',
        requestedCheckin: { [Op.between]: [start, end] }
      }
    }).then(rows => rows.map(r => r.ReservationId));

    // For each service, count how many completed reservations chose it
    const serviceUsageMap = {};
    
    for (const service of allServices) {
      // Count DISTINCT completed reservations that used this service
      const usageCount = await ConsumedService.count({
        distinct: true,
        col: 'InvoiceId',
        include: [{
          model: Invoice,
          attributes: [],
          where: {
            ReservationId: completedIds
          }
        }],
        where: {
          ServiceId: service.ServiceId
        }
      });

      serviceUsageMap[service.ServiceId] = {
        name: service.name,
        count: usageCount,
        percentage: totalReservations > 0 ? Math.round((usageCount / totalReservations) * 100) : 0
      };
    }

    // Convert to array and sort by percentage descending
    const data = allServices
      .map(service => {
        const usage = serviceUsageMap[service.ServiceId];
        return {
          name: usage.name,
          value: usage.percentage,
          count: usage.count,
          total: totalReservations
        };
      })
      .sort((a, b) => b.value - a.value);

    res.json(data);
  } catch (err) {
    console.error('Service usage error:', err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// Recent Guest Feedback
dashboardRouter.get("/recent-feedback", async (req, res) => {
  try {
    const period = req.query.period || 'thisMonth';
    const { start, end } = getDateRange(period);
    
    const feedbacks = await Feedback.findAll({
      where: {
        createdAt: { [Op.between]: [start, end] }
      },
      include: [
        { 
          model: Client,
          attributes: ['FirstName', 'LastName', 'Email', 'profilePicture']
        },
        { 
          model: Reservation,
          attributes: ['ReservationId', 'requestedCheckin', 'requestedCheckout']
        }
      ],
      order: [["submissionDate", "DESC"], ["createdAt", "DESC"]],
      limit: 3
    });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "server error", error: err.message });
  }
});

export default dashboardRouter;

