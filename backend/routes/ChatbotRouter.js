import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRooms } from "../dataAccess/RoomDA.js";
import { getServices } from "../dataAccess/ServiceDA.js";

const chatbotRouter = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fallbackAppUrl = (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EUR`;

function normalizeRoom(room) {
  const theme = room.RoomTheme || {};
  return {
    name: theme.name || theme.theme || `Room ${room.RoomId}`,
    city: theme.city,
    price: theme.basePrice,
    guests: theme.maxGuests || 2,
    amenities: Array.isArray(theme.amenities) ? theme.amenities.join(", ") : theme.amenities
  };
}

function normalizeService(service) {
  return {
    name: service.name || service.ServiceName || "Hotel service",
    category: service.category || "Service",
    price: service.price || service.Price,
    description: service.description || service.Description
  };
}

function detectLanguage(message = "") {
  return /\b(buna|salut|camera|camere|rezervare|serviciu|servicii|pret|vreau|putea|poti)\b/i.test(message)
    ? "ro"
    : "en";
}

function buildFallbackReply(message, rooms, services) {
  const language = detectLanguage(message);
  const text = message.toLowerCase();
  const roomSummaries = rooms.slice(0, 3).map(normalizeRoom);
  const serviceSummaries = services.slice(0, 3).map(normalizeService);
  const mentionsServices = /service|servici|spa|cooking|yoga|tour|tur|masaj|massage|restaurant|dining/i.test(text);
  const mentionsBooking = /book|booking|reserve|reservation|rezerv|plata|payment/i.test(text);

  if (language === "ro") {
    if (mentionsBooking) {
      return `Sigur. Pentru rezervare, mergi la ${fallbackAppUrl}/booking si alege perioada, camera si serviciile dorite. Daca imi spui cate persoane si ce perioada ai in minte, iti pot recomanda o optiune potrivita.`;
    }

    if (mentionsServices && serviceSummaries.length) {
      const picks = serviceSummaries.map((service) => `${service.name} (${formatMoney(service.price)})`).join(", ");
      return `Avem servicii premium precum ${picks}. Le poti adauga la o rezervare confirmata din pagina Services sau din detaliile rezervarii.`;
    }

    if (roomSummaries.length) {
      const picks = roomSummaries
        .map((room) => `${room.name}${room.city ? `, ${room.city}` : ""} - de la ${formatMoney(room.price)}/noapte`)
        .join("; ");
      return `Iti pot recomanda cateva camere: ${picks}. Spune-mi perioada si numarul de persoane si te ghidez mai exact.`;
    }

    return "Sunt aici sa te ajut cu camere, servicii si rezervari Cityscape. Spune-mi ce fel de sejur cauti si iti recomand ceva potrivit.";
  }

  if (mentionsBooking) {
    return `Of course. To book, open ${fallbackAppUrl}/booking and choose your dates, room, and any extra services. Tell me your dates and guest count and I can suggest a good option.`;
  }

  if (mentionsServices && serviceSummaries.length) {
    const picks = serviceSummaries.map((service) => `${service.name} (${formatMoney(service.price)})`).join(", ");
    return `We offer premium services such as ${picks}. You can add them from the Services page or from your reservation details.`;
  }

  if (roomSummaries.length) {
    const picks = roomSummaries
      .map((room) => `${room.name}${room.city ? `, ${room.city}` : ""} from ${formatMoney(room.price)}/night`)
      .join("; ");
    return `A few Cityscape options are ${picks}. Share your dates and guest count and I can narrow it down.`;
  }

  return "I can help with Cityscape rooms, services, and bookings. Tell me what kind of stay you are looking for and I will guide you.";
}

function buildSystemPrompt(message, rooms, services) {
  const roomsString = rooms
    .map(normalizeRoom)
    .map((room) => {
      const details = [
        room.city,
        `${formatMoney(room.price)}/night`,
        `capacity: ${room.guests}`,
        room.amenities ? `amenities: ${room.amenities}` : null
      ].filter(Boolean).join(", ");
      return `- ${room.name}: ${details}`;
    })
    .join("\n");

  const servicesString = services
    .map(normalizeService)
    .map((service) => `- ${service.name}: ${formatMoney(service.price)} (${service.category}; ${service.description || "N/A"})`)
    .join("\n");

  return `You are a friendly hotel assistant for Cityscape Hotel.

ROOMS AVAILABLE:
${roomsString}

SERVICES:
${servicesString}

Guest message:
${message}

Your job:
1. Answer guest questions about our rooms, prices, amenities, services, and booking steps.
2. Recommend rooms or services based on their needs.
3. Be short and helpful, maximum 2-3 sentences.
4. For bookings, direct them to ${fallbackAppUrl}/booking.
5. Always respond in the same language the guest used.`;
}

chatbotRouter.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const rooms = await getRooms();
    const services = await getServices();

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: buildFallbackReply(message, rooms, services),
        timestamp: new Date()
      });
    }

    try {
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ],
        systemInstruction: buildSystemPrompt(message, rooms, services)
      });

      return res.json({
        reply: result.response.text(),
        timestamp: new Date()
      });
    } catch (aiError) {
      console.error("Chatbot AI fallback:", aiError.message);
      return res.json({
        reply: buildFallbackReply(message, rooms, services),
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error("Chatbot error:", error.message);
    return res.status(500).json({ error: "Failed to process chat message" });
  }
});

export default chatbotRouter;
