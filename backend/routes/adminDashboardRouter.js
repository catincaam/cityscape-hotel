import express from "express";
import { Op } from "sequelize";
import Reservation from "../entities/Reservation.js";
import Room from "../entities/Room.js";
import Feedback from "../entities/Feedback.js";
import ConsumedService from "../entities/ConsumedService.js";
import Client from "../entities/Client.js";
import Service from "../entities/Service.js";

const dashboardRouter = express.Router();

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

// KPI: Total Revenue, Average Occupancy, Satisfaction Score, Cash Received
// GET /api/admin/dashboard/kpi?period=thisMonth
dashboardRouter.get("/kpi", async (req, res) => {
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
    
    // Total cash received: sum of all payments in date range
    const cashReceived = await Payment.sum("amount", {
      where: {
        createdAt: { [Op.between]: [start, end] }
      }
    }) || 0;
    
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
      const sum = feedbacks.reduce((acc, f) => acc + (f.serviceRating ? Number(f.serviceRating) : 0), 0);
      satisfaction = (sum / feedbacks.length).toFixed(1);
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
      order: [["createdAt", "DESC"]],
      limit: 5
    });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "server error", error: err.message });
  }
});

export default dashboardRouter;
