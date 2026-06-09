import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRooms } from "../dataAccess/RoomDA.js";
import { getServices } from "../dataAccess/ServiceDA.js";

const chatbotRouter = express.Router();

const fallbackAppUrl = (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EUR`;

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function getGeminiModels() {
  const configuredModel = process.env.GEMINI_MODEL;
  return [
    configuredModel,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b"
  ].filter((model, index, list) => model && list.indexOf(model) === index);
}

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
  return /\b(buna|salut|camera|camere|rezervare|serviciu|servicii|pret|vreau|putea|poti|anulare|anulez|cont|parola|multumesc)\b/i.test(message)
    ? "ro"
    : "en";
}

function detectIntent(message = "") {
  const text = String(message || "").toLowerCase();

  if (/\b(hi|hello|hey|buna|salut|hei)\b/i.test(text)) return "greeting";
  if (/\b(thanks|thank you|multumesc|mersi)\b/i.test(text)) return "thanks";
  if (/cancel|cancell?ation|anul|renunt/i.test(text)) return "cancel";
  if (/service|servici|spa|cooking|yoga|tour|tur|masaj|massage|restaurant|dining|mic dejun|breakfast/i.test(text)) return "services";
  if (/book|booking|reserve|reservation|rezerv|plata|payment|pay|check-?in|check-?out/i.test(text)) return "booking";
  if (/room|rooms|camera|camere|suite|tokyo|seoul|shanghai|lisbon|lisabona|prague|praga|cancun|kyoto|rome|roma|price|pret|cost|capacity|capacitate|guest|oaspet/i.test(text)) return "rooms";
  if (/login|sign ?in|sign ?up|register|account|cont|parola|password|email/i.test(text)) return "account";

  return "general";
}

function pickRooms(rooms, message) {
  const text = String(message || "").toLowerCase();
  const normalizedRooms = rooms.map(normalizeRoom);
  const matching = normalizedRooms.filter((room) => {
    const haystack = [room.name, room.city, room.amenities].filter(Boolean).join(" ").toLowerCase();
    return haystack && haystack.split(/\s+/).some((word) => word.length > 3 && text.includes(word));
  });

  return (matching.length ? matching : normalizedRooms).slice(0, 3);
}

function buildFallbackReply(message, rooms, services) {
  const language = detectLanguage(message);
  const intent = detectIntent(message);
  const roomSummaries = pickRooms(rooms, message);
  const serviceSummaries = services.slice(0, 3).map(normalizeService);

  if (language === "ro") {
    if (intent === "greeting") {
      return "Buna! Te pot ajuta cu recomandari de camere, servicii extra, rezervari, plati sau anularea unui sejur.";
    }

    if (intent === "thanks") {
      return "Cu drag! Daca mai ai nevoie de camere, servicii sau detalii despre o rezervare, sunt aici.";
    }

    if (intent === "cancel") {
      return "Pentru anulare, deschide detaliile rezervarii si apasa Cancel Reservation, daca sejurul este viitor. Aplicatia iti cere confirmarea inainte sa schimbe statusul in cancelled.";
    }

    if (intent === "booking") {
      return `Sigur. Pentru rezervare, mergi la ${fallbackAppUrl}/booking si alege perioada, camera si serviciile dorite. Daca imi spui cate persoane si ce perioada ai in minte, iti pot recomanda o optiune potrivita.`;
    }

    if (intent === "services" && serviceSummaries.length) {
      const picks = serviceSummaries.map((service) => `${service.name} (${formatMoney(service.price)})`).join(", ");
      return `Avem servicii premium precum ${picks}. Le poti adauga la o rezervare confirmata din pagina Services sau din detaliile rezervarii.`;
    }

    if (intent === "rooms" && roomSummaries.length) {
      const picks = roomSummaries
        .map((room) => `${room.name}${room.city ? `, ${room.city}` : ""} - de la ${formatMoney(room.price)}/noapte`)
        .join("; ");
      return `Iti pot recomanda cateva camere: ${picks}. Spune-mi perioada si numarul de persoane si te ghidez mai exact.`;
    }

    if (intent === "account") {
      return "Pentru cont, foloseste emailul si parola la autentificare. Daca ai uitat parola, apasa Forgot your password? din pagina de login.";
    }

    return "Te pot ajuta cu informatii despre camere, servicii, rezervari, plati si anularea sejururilor Cityscape. Reformuleaza intrebarea in zona aceasta si iti raspund punctual.";
  }

  if (intent === "greeting") {
    return "Hello! I can help with room recommendations, extra services, bookings, payments, or reservation cancellation.";
  }

  if (intent === "thanks") {
    return "You are welcome. Ask me anytime about rooms, services, or your booking flow.";
  }

  if (intent === "cancel") {
    return "To cancel, open the reservation details and choose Cancel Reservation if the stay is still upcoming. The app asks for confirmation before changing the status to cancelled.";
  }

  if (intent === "booking") {
    return `Of course. To book, open ${fallbackAppUrl}/booking and choose your dates, room, and any extra services. Tell me your dates and guest count and I can suggest a good option.`;
  }

  if (intent === "services" && serviceSummaries.length) {
    const picks = serviceSummaries.map((service) => `${service.name} (${formatMoney(service.price)})`).join(", ");
    return `We offer premium services such as ${picks}. You can add them from the Services page or from your reservation details.`;
  }

  if (intent === "rooms" && roomSummaries.length) {
    const picks = roomSummaries
      .map((room) => `${room.name}${room.city ? `, ${room.city}` : ""} from ${formatMoney(room.price)}/night`)
      .join("; ");
    return `A few Cityscape options are ${picks}. Share your dates and guest count and I can narrow it down.`;
  }

  if (intent === "account") {
    return "For your account, sign in with your email and password. If you forgot it, use Forgot your password? on the login page.";
  }

  return "I can help with Cityscape rooms, services, bookings, payments, and cancellations. Ask me something in that area and I will answer directly.";
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

async function generateGeminiReply(message, rooms, services) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemInstruction = buildSystemPrompt(message, rooms, services);
  let lastError = null;

  for (const modelName of getGeminiModels()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction
      });
      const result = await model.generateContent(message);
      const reply = result.response.text();

      if (reply?.trim()) {
        return {
          reply: reply.trim(),
          model: modelName
        };
      }

      lastError = new Error(`${modelName} returned an empty reply`);
    } catch (error) {
      lastError = error;
      console.warn(`[CHATBOT] Gemini model ${modelName} failed:`, error.message);
    }
  }

  throw lastError || new Error("Gemini did not return a reply");
}

chatbotRouter.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const rooms = await getRooms();
    const services = await getServices();

    if (!getGeminiApiKey()) {
      console.warn("[CHATBOT] Gemini key missing. Using local fallback reply.");
      return res.json({
        reply: buildFallbackReply(message, rooms, services),
        source: "fallback",
        timestamp: new Date()
      });
    }

    try {
      const aiReply = await generateGeminiReply(message, rooms, services);

      return res.json({
        reply: aiReply.reply,
        source: "gemini",
        model: aiReply.model,
        timestamp: new Date()
      });
    } catch (aiError) {
      console.error("[CHATBOT] Gemini unavailable. Using fallback reply:", aiError.message);
      return res.json({
        reply: buildFallbackReply(message, rooms, services),
        source: "fallback",
        error: process.env.NODE_ENV === "production" ? undefined : aiError.message,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error("Chatbot error:", error.message);
    return res.status(500).json({ error: "Failed to process chat message" });
  }
});

export default chatbotRouter;
