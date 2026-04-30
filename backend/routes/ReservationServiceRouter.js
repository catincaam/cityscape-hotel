// backend/routes/ReservationServiceRouter.js
import express from "express";
import {
  addServiceToReservation,
  getReservationServices,
  getReservationService,
  updateReservationService,
  removeServiceFromReservation,
  clearReservationServices,
  calculateServicesTotal
} from "../dataAccess/ReservationServiceDA.js";
import Client from "../entities/Client.js";
import Reservation from "../entities/Reservation.js";
import Service from "../entities/Service.js";
import { sendServiceAddedEmail } from "../services/emailService.js";

const reservationServiceRouter = express.Router();

/* CREATE - Adaugă serviciu la rezervare */
reservationServiceRouter.post("/", async (req, res) => {
  try {
    const service = await addServiceToReservation(req.body);

    let emailResult = { success: false, error: "Email was not attempted." };
    try {
      const reservation = await Reservation.findByPk(service.ReservationId);
      const client = reservation ? await Client.findByPk(reservation.ClientId) : null;
      const serviceDetails = await Service.findByPk(service.ServiceId);

      emailResult = await sendServiceAddedEmail({
        client,
        reservation,
        service: serviceDetails,
        reservationService: service
      });

      if (!emailResult.success) {
        console.warn("[SERVICE EMAIL] Confirmation email not sent:", emailResult.error);
      }
    } catch (emailError) {
      emailResult = { success: false, error: emailError.message };
      console.error("[SERVICE EMAIL ERROR]", emailError);
    }

    res.status(201).json({
      service,
      email: {
        sent: Boolean(emailResult.success),
        error: emailResult.success ? undefined : emailResult.error
      }
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "server error" });
  }
});

/* READ - Toate serviciile pentru o rezervare */
reservationServiceRouter.get("/reservation/:reservationId", async (req, res) => {
  try {
    const services = await getReservationServices(req.params.reservationId);
    res.status(200).json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ - Total servicii pentru o rezervare */
reservationServiceRouter.get("/reservation/:reservationId/total", async (req, res) => {
  try {
    const total = await calculateServicesTotal(req.params.reservationId);
    res.status(200).json({ total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ ONE - Un serviciu specific */
reservationServiceRouter.get("/:reservationId/:serviceId", async (req, res) => {
  try {
    const { reservationId, serviceId } = req.params;
    const service = await getReservationService(reservationId, serviceId);
    if (!service) return res.status(404).json({ message: "not found" });
    res.status(200).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE - Actualizează cantitatea */
reservationServiceRouter.put("/:reservationId/:serviceId", async (req, res) => {
  try {
    const { reservationId, serviceId } = req.params;
    const updated = await updateReservationService(reservationId, serviceId, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE - Șterge un serviciu */
reservationServiceRouter.delete("/:reservationId/:serviceId", async (req, res) => {
  try {
    const { reservationId, serviceId } = req.params;
    const deleted = await removeServiceFromReservation(reservationId, serviceId);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE ALL - Șterge toate serviciile unei rezervări */
reservationServiceRouter.delete("/reservation/:reservationId", async (req, res) => {
  try {
    const count = await clearReservationServices(req.params.reservationId);
    res.status(200).json({ message: `${count} servicii șterse` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default reservationServiceRouter;
