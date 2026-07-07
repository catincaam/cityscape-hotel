import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAvailableRooms, getRooms } from "../dataAccess/RoomDA.js";
import { getServices } from "../dataAccess/ServiceDA.js";
import {
  getBookingWindowMaxDate,
  isPositiveInteger,
  isValidDateRange,
  isWithinBookingWindow
} from "../utils/validators.js";

const chatbotRouter = express.Router();

const fallbackAppUrl = (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EUR`;
const MONTHS = {
  january: 0,
  jan: 0,
  ianuarie: 0,
  february: 1,
  feb: 1,
  februarie: 1,
  march: 2,
  mar: 2,
  martie: 2,
  april: 3,
  apr: 3,
  aprilie: 3,
  may: 4,
  mai: 4,
  june: 5,
  jun: 5,
  iunie: 5,
  july: 6,
  jul: 6,
  iulie: 6,
  august: 7,
  aug: 7,
  septembrie: 8,
  september: 8,
  sep: 8,
  october: 9,
  oct: 9,
  octombrie: 9,
  november: 10,
  nov: 10,
  noiembrie: 10,
  december: 11,
  dec: 11,
  decembrie: 11
};

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY
    || process.env.GEMINI_KEY
    || process.env.GOOGLE_GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function getGeminiApiKeySource() {
  return [
    "GEMINI_API_KEY",
    "GEMINI_KEY",
    "GOOGLE_GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY"
  ].find((key) => Boolean(process.env[key]));
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
    id: theme.RoomThemeId || room.RoomThemeId || room.RoomId,
    name: theme.name || theme.theme || `Room ${room.RoomId}`,
    city: theme.city,
    price: theme.basePrice,
    guests: theme.maxGuests || 2,
    amenities: Array.isArray(theme.amenities) ? theme.amenities.join(", ") : theme.amenities
  };
}

function getUniqueRooms(rooms = []) {
  const uniqueRooms = new Map();

  rooms.map(normalizeRoom).forEach((room) => {
    const key = room.id || `${normalizeMessage(room.city)}-${normalizeMessage(room.name)}`;
    if (!uniqueRooms.has(key)) {
      uniqueRooms.set(key, room);
    }
  });

  return Array.from(uniqueRooms.values());
}

function normalizeService(service) {
  return {
    name: service.name || service.ServiceName || "Hotel service",
    category: service.category || "Service",
    price: service.price || service.Price,
    description: service.description || service.Description
  };
}

function normalizeMessage(message = "") {
  return String(message || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectLanguage(message = "") {
  const text = normalizeMessage(message);
  return /\b(bu+n+a+|bn|salut|dc|de ce|cn|avem|este|exista|camera|camere|rezervare|serviciu|servicii|pret|vreau|putea|poti|anulare|anulez|cont|parola|multumesc|mersi|zilele|iulie)\b/i.test(text)
    ? "ro"
    : "en";
}

function detectIntent(message = "") {
  const text = normalizeMessage(message);
  const mentionsRoomOrCity = /room|rooms|camera|camere|suite|tok+y?o|tok|seoul|shanghai|lisbon|lisabona|prague|praga|cancun|kyoto|rome|roma/i.test(text);

  if (/\b(hi|hello|hey|bu+n+a+|bn|salut|hei)\b/i.test(text)) return "greeting";
  if (/\b(thanks|thank you|multumesc|mersi)\b/i.test(text)) return "thanks";
  if (/cancel|cancell?ation|anul|renunt/i.test(text)) return "cancel";
  if (/service|servici|spa|cooking|yoga|tour|tur|masaj|massage|restaurant|dining|mic dejun|breakfast/i.test(text)) return "services";
  if ((/avem|este|exista|nu apare|not show|not available|available|disponibil|liber|free|zile|date|iulie|july/i.test(text) && mentionsRoomOrCity)) return "availability";
  if (/book|booking|reserve|reservation|rezerv|plata|payment|pay|check-?in|check-?out/i.test(text)) return "booking";
  if (mentionsRoomOrCity || /price|pret|cost|capacity|capacitate|guest|oaspet/i.test(text)) return "rooms";
  if (/login|sign ?in|sign ?up|register|account|cont|parola|password|email/i.test(text)) return "account";

  return "general";
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function formatDateOnly(date) {
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`;
}

function getTodayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function buildRequestedDate(startDay, endDay, monthIndex, explicitYear) {
  if (!startDay || !endDay || monthIndex < 0 || monthIndex > 11) return null;

  const today = getTodayUtcDate();
  let year = explicitYear || today.getUTCFullYear();
  let checkIn = new Date(Date.UTC(year, monthIndex, Number(startDay)));
  let checkOut = new Date(Date.UTC(year, monthIndex, Number(endDay)));

  if (!explicitYear && checkOut < today) {
    year += 1;
    checkIn = new Date(Date.UTC(year, monthIndex, Number(startDay)));
    checkOut = new Date(Date.UTC(year, monthIndex, Number(endDay)));
  }

  const datesAreReal = checkIn.getUTCFullYear() === year
    && checkIn.getUTCMonth() === monthIndex
    && checkIn.getUTCDate() === Number(startDay)
    && checkOut.getUTCFullYear() === year
    && checkOut.getUTCMonth() === monthIndex
    && checkOut.getUTCDate() === Number(endDay);

  if (!datesAreReal) return null;

  return {
    checkIn: formatDateOnly(checkIn),
    checkOut: formatDateOnly(checkOut)
  };
}

function parseGuestCount(text) {
  const patterns = [
    /\b(?:for|pentru)\s+(\d{1,2})\b/i,
    /\b(\d{1,2})\s*(?:people|persons|guests|adults|adulti|persoane|oaspeti)\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

function parseAvailabilityRequest(message = "") {
  const text = normalizeMessage(message);
  if (!/(available|availability|free|liber|disponibil|camera|room|rooms|rezerv|book|booking|check in|check out)/i.test(text)) {
    return null;
  }

  const monthNames = Object.keys(MONTHS).join("|");
  const numericRange = text.match(new RegExp(`\\b(\\d{1,2})\\s*[-/]\\s*(\\d{1,2})\\s+(${monthNames})(?:\\s+(\\d{4}))?\\b`, "i"));
  const monthFirstRange = text.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})\\s*[-/]\\s*(\\d{1,2})(?:\\s+(\\d{4}))?\\b`, "i"));

  let dates = null;
  if (numericRange) {
    dates = buildRequestedDate(
      Number(numericRange[1]),
      Number(numericRange[2]),
      MONTHS[numericRange[3]],
      numericRange[4] ? Number(numericRange[4]) : null
    );
  } else if (monthFirstRange) {
    dates = buildRequestedDate(
      Number(monthFirstRange[2]),
      Number(monthFirstRange[3]),
      MONTHS[monthFirstRange[1]],
      monthFirstRange[4] ? Number(monthFirstRange[4]) : null
    );
  }

  if (!dates) return null;

  return {
    ...dates,
    guests: parseGuestCount(text) || 2
  };
}

function formatHumanDateRange(checkIn, checkOut, language) {
  const locale = language === "ro" ? "ro-RO" : "en-GB";
  const options = { month: "long", day: "numeric" };
  const start = new Intl.DateTimeFormat(locale, options).format(new Date(`${checkIn}T00:00:00Z`));
  const end = new Intl.DateTimeFormat(locale, options).format(new Date(`${checkOut}T00:00:00Z`));
  return `${start} - ${end}`;
}

function normalizeAvailableRoom(room) {
  const theme = room.RoomTheme || {};
  return {
    name: theme.name || theme.theme || `Room ${room.RoomId}`,
    city: theme.city,
    price: theme.basePrice,
    guests: theme.maxGuests || 2,
    availableCount: Number(room.availableCount || 0)
  };
}

function buildAvailabilityReply(message, request, availableRooms) {
  const language = detectLanguage(message);
  const dateRange = formatHumanDateRange(request.checkIn, request.checkOut, language);
  const totalRooms = availableRooms.reduce((sum, room) => sum + Number(room.availableCount || 0), 0);
  const topRooms = availableRooms.map(normalizeAvailableRoom).slice(0, 4);

  if (!isPositiveInteger(request.guests)) {
    return language === "ro"
      ? "Spune-mi, te rog, pentru cate persoane vrei sa verific disponibilitatea."
      : "Please tell me how many guests I should check availability for.";
  }

  if (!isValidDateRange(request.checkIn, request.checkOut)) {
    return language === "ro"
      ? "Perioada nu pare valida. Te rog sa imi scrii intervalul ca check-in si check-out, de exemplu 10-12 iulie."
      : "That date range does not look valid. Please write it as check-in to check-out, for example July 10-12.";
  }

  if (!isWithinBookingWindow(request.checkIn, request.checkOut)) {
    return language === "ro"
      ? `Rezervarile sunt disponibile pana la ${getBookingWindowMaxDate()}. Alege, te rog, o perioada din acest interval.`
      : `Bookings are available up to ${getBookingWindowMaxDate()}. Please choose dates inside that window.`;
  }

  if (!topRooms.length) {
    return language === "ro"
      ? `Pentru ${dateRange}, ${request.guests} persoane, nu am gasit camere disponibile in acest moment. Incearca o alta perioada sau mai putine persoane.`
      : `For ${dateRange}, ${request.guests} guests, I could not find available rooms right now. Try a different date range or fewer guests.`;
  }

  if (language === "ro") {
    const picks = topRooms
      .map((room) => `${room.name}${room.city ? ` (${room.city})` : ""} - ${formatMoney(room.price)}/noapte, capacitate ${room.guests}, ${room.availableCount} camere libere`)
      .join("; ");
    return `Da. Pentru ${dateRange}, ${request.guests} persoane, am gasit ${totalRooms} camere disponibile. Cateva optiuni bune sunt: ${picks}. Poti continua din Book Room pentru rezervare.`;
  }

  const picks = topRooms
    .map((room) => `${room.name}${room.city ? ` (${room.city})` : ""} - ${formatMoney(room.price)}/night, capacity ${room.guests}, ${room.availableCount} available`)
    .join("; ");
  return `Yes. For ${dateRange}, ${request.guests} guests, I found ${totalRooms} available rooms. Good options include: ${picks}. You can continue from Book Room to reserve one.`;
}

function getRequestedCity(message = "") {
  const text = normalizeMessage(message);
  const cityMatchers = [
    ["Tokyo", /\btok+\w*o\b|\btok\b|\btokyo\b|\btokkyo\b/i],
    ["Seoul", /\bseou?l\b/i],
    ["Shanghai", /\bshang?hai\b/i],
    ["Lisbon", /\blisbon\b|\blisabona\b/i],
    ["Prague", /\bprague\b|\bpraga\b/i],
    ["Cancun", /\bcancun\b/i],
    ["Kyoto", /\bkyoto\b/i],
    ["Rome", /\brome\b|\broma\b/i]
  ];
  return cityMatchers.find(([, matcher]) => matcher.test(text))?.[0] || null;
}

function pickRooms(rooms, message) {
  const text = normalizeMessage(message);
  const normalizedRooms = getUniqueRooms(rooms);
  const requestedCity = getRequestedCity(message);

  if (requestedCity) {
    const byCity = normalizedRooms.filter((room) => normalizeMessage(room.city).includes(normalizeMessage(requestedCity)));
    if (byCity.length) return byCity.slice(0, 3);
  }

  const matching = normalizedRooms.filter((room) => {
    const haystack = normalizeMessage([room.name, room.city, room.amenities].filter(Boolean).join(" "));
    return haystack && haystack.split(/\s+/).some((word) => word.length > 2 && text.includes(word.slice(0, Math.min(word.length, 5))));
  });

  return (matching.length ? matching : normalizedRooms).slice(0, 3);
}

function buildFallbackReply(message, rooms, services) {
  const language = detectLanguage(message);
  const intent = detectIntent(message);
  const roomSummaries = pickRooms(rooms, message);
  const requestedCity = getRequestedCity(message);
  const availableCities = Array.from(
    new Set(getUniqueRooms(rooms).map((room) => room.city).filter(Boolean))
  ).slice(0, 8);
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

    if (intent === "availability") {
      if (requestedCity && roomSummaries.some((room) => normalizeMessage(room.city).includes(normalizeMessage(requestedCity)))) {
        const picks = roomSummaries
          .map((room) => `${room.name} - de la ${formatMoney(room.price)}/noapte, capacitate ${room.guests} persoane`)
          .join("; ");
        return `Da, avem ${requestedCity}: ${picks}. Daca nu apare pentru datele alese, probabil nu este libera atunci sau este ascunsa de filtre.`;
      }

      return `Nu gasesc ${requestedCity || "camera ceruta"} in catalogul curent. Orase disponibile acum: ${availableCities.join(", ")}.`;
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

  if (intent === "availability") {
    if (requestedCity && roomSummaries.some((room) => normalizeMessage(room.city).includes(normalizeMessage(requestedCity)))) {
      const picks = roomSummaries
        .map((room) => `${room.name} from ${formatMoney(room.price)}/night, capacity ${room.guests}`)
        .join("; ");
      return `Yes, we have ${requestedCity}: ${picks}. If it does not appear for your dates, it is probably unavailable then or hidden by filters.`;
    }

    return `I do not see ${requestedCity || "that room"} in the current catalog. Available cities include ${availableCities.join(", ")}.`;
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
  const language = detectLanguage(message);
  const roomsString = getUniqueRooms(rooms)
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
5. Always respond in ${language === "ro" ? "Romanian" : "English"}.
6. If the guest asks if a city exists, answer yes only when that city appears in ROOMS AVAILABLE.
7. Do not repeat duplicate rooms. If a room is unavailable for selected dates, explain that availability depends on dates and filters.`;
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
    const availabilityRequest = parseAvailabilityRequest(message);

    if (availabilityRequest) {
      const canSearchAvailability = isPositiveInteger(availabilityRequest.guests)
        && isValidDateRange(availabilityRequest.checkIn, availabilityRequest.checkOut)
        && isWithinBookingWindow(availabilityRequest.checkIn, availabilityRequest.checkOut);
      const availableRooms = canSearchAvailability
        ? await getAvailableRooms({
            checkIn: availabilityRequest.checkIn,
            checkOut: availabilityRequest.checkOut,
            guests: availabilityRequest.guests
          })
        : [];

      return res.json({
        reply: buildAvailabilityReply(message, availabilityRequest, availableRooms),
        source: "availability",
        timestamp: new Date()
      });
    }

    if (!getGeminiApiKey()) {
      console.warn("[CHATBOT] Gemini key missing. Expected one of: GEMINI_API_KEY, GEMINI_KEY, GOOGLE_GEMINI_API_KEY, GOOGLE_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY. Using local fallback reply.");
      return res.json({
        reply: buildFallbackReply(message, rooms, services),
        source: "fallback",
        timestamp: new Date()
      });
    }

    try {
      console.log(`[CHATBOT] Using Gemini key from ${getGeminiApiKeySource()}.`);
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
