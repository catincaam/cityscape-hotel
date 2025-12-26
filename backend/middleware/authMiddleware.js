// backend/middleware/authClient.js
import jwt from "jsonwebtoken";

// Middleware pentru autentificarea clientului
export default function authClient(req, res, next) {
  const authHeader = req.headers.authorization; // Header: "Bearer <token>"

  if (!authHeader) {
    return res.status(401).json({ message: "Missing token" });
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Invalid auth header" });
  }

  try {
    // Verificăm token-ul cu secretul din .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Punem datele clientului în req pentru a fi folosite în route-uri
    req.client = decoded; // { ClientId, FirstName, LastName, TypeClientTip, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
