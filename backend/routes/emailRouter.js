import express from "express";
import { sendTestEmail } from "../services/emailService.js";

const emailRouter = express.Router();

// 🧪 Test endpoint pentru verificare email
emailRouter.post("/test", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email necesar" });
    }

    const result = await sendTestEmail(email);
    
    if (result.success) {
      res.status(200).json({ message: "Email de test trimis cu succes!" });
    } else {
      res.status(500).json({ message: "Eroare trimitere email", error: result.error });
    }
  } catch (error) {
    res.status(500).json({ message: "Eroare server", error: error.message });
  }
});

export default emailRouter;
