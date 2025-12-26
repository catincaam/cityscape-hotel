import express from "express";
import {
  createRoomTheme,
  getRoomThemeById,
  getRoomThemes,
  updateRoomTheme,
  deleteRoomTheme
} from "../dataAccess/RoomThemeDA.js";
import Room from "../entities/Room.js";
import RoomImage from "../entities/RoomImage.js";

const roomThemeRouter = express.Router();

/* CREATE */
roomThemeRouter.post("/", async (req, res) => {
  try {
    const { images, ...themeData } = req.body;
    
    // Creăm tema
    const theme = await createRoomTheme(themeData);
    
    // Dacă avem imagini, le adăugăm
    if (images && Array.isArray(images) && images.length > 0) {
      await Promise.all(
        images.map((imageUrl, index) =>
          RoomImage.create({
            RoomThemeId: theme.RoomThemeId,
            imageUrl,
            isPrimary: index === 0, // Prima imagine e principală
            orderIndex: index
          })
        )
      );
    }
    
    res.status(201).json(theme);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ all with available rooms info */
roomThemeRouter.get("/", async (req, res) => {
  try {
    const themes = await getRoomThemes();
    
    // Pentru fiecare temă, găsim camerele disponibile, etajele și imaginile
    const themesWithRooms = await Promise.all(
      themes.map(async (theme) => {
        const rooms = await Room.findAll({
          where: { RoomThemeId: theme.RoomThemeId, status: "disponibil" }
        });
        
        const images = await RoomImage.findAll({
          where: { RoomThemeId: theme.RoomThemeId },
          order: [["orderIndex", "ASC"]]
        });
        
        const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
        const availableCount = rooms.length;
        
        return {
          ...theme.toJSON(),
          availableCount,
          floors,
          images: images.map(img => img.imageUrl)
        };
      })
    );
    
    res.status(200).json(themesWithRooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* READ by ID */
roomThemeRouter.get("/:id", async (req, res) => {
  try {
    const theme = await getRoomThemeById(req.params.id);
    if (!theme) return res.status(404).json({ message: "not found" });
    
    // Adăugăm imaginile
    const images = await RoomImage.findAll({
      where: { RoomThemeId: theme.RoomThemeId },
      order: [["orderIndex", "ASC"]]
    });
    
    res.status(200).json({
      ...theme.toJSON(),
      images: images.map(img => img.imageUrl)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
roomThemeRouter.put("/:id", async (req, res) => {
  try {
    const updated = await updateRoomTheme(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* DELETE */
roomThemeRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteRoomTheme(req.params.id);
    if (!deleted) return res.status(404).json({ message: "not found" });
    res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default roomThemeRouter;
