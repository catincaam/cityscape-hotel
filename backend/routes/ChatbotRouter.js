import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { getRooms } from "../dataAccess/RoomDA.js";
import { getServices } from "../dataAccess/ServiceDA.js";

const chatbotRouter = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* CHAT ENDPOINT */
chatbotRouter.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get data from database
    const rooms = await getRooms();
    const services = await getServices();

    // Format room data for AI context
    const roomsString = rooms
      .map(
        (room) =>
          `- ${room.RoomName} (${room.RoomTheme?.ThemeName || "No theme"}): $${room.Price}/night, capacity: ${room.Capacity}, amenities: ${room.Amenities || "N/A"}`
      )
      .join("\n");

    const servicesString = services
      .map((service) => `- ${service.ServiceName}: $${service.Price} (${service.Description || "N/A"})`)
      .join("\n");

    // Create system prompt with hotel context
    const systemPrompt = `You are a friendly hotel assistant for Cityscape Hotel.

ROOMS AVAILABLE:
${roomsString}

SERVICES:
${servicesString}

Your job:
1. Answer guest questions about our rooms, prices, and amenities
2. Recommend rooms based on their needs
3. Be short and helpful (2-3 sentences max)
4. For bookings: direct them to: http://localhost:3000/booking
5. Always respond in the same language they used

Keep responses brief and friendly!`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: message
            }
          ]
        }
      ],
      systemInstruction: systemPrompt
    });

    const response = result.response.text();

    res.json({
      reply: response,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("❌ Chatbot error:", error.message);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

export default chatbotRouter;
