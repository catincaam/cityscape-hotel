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
import { normalizeTextValues } from "../utils/normalizeText.js";

const roomThemeRouter = express.Router();

/* CREATE */
roomThemeRouter.post("/", async (req, res) => {
  try {
    const { images, ...themeData } = normalizeTextValues(req.body);
    
    // Convertim string-uri goale în null pentru INTEGER fields
    if (themeData.size === '' || themeData.size === undefined) {
      themeData.size = null;
    }
    if (themeData.bedType === '') {
      themeData.bedType = null;
    }
    if (themeData.showcaseImage === '') {
      themeData.showcaseImage = null;
    }
    
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
        const imageUrls = images.map(img => img.imageUrl);
        const displayImage = imageUrls[0] || theme.image || theme.showcaseImage;
        
        return {
          ...theme.toJSON(),
          showcaseImage: displayImage,
          availableCount,
          floors,
          images: imageUrls
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
    
    const imageUrls = images.map(img => img.imageUrl);
    const displayImage = imageUrls[0] || theme.image || theme.showcaseImage;

    res.status(200).json({
      ...theme.toJSON(),
      showcaseImage: displayImage,
      images: imageUrls
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

/* UPDATE */
roomThemeRouter.put("/:id", async (req, res) => {
  try {
    const { images, ...themeData } = normalizeTextValues(req.body);
    if (themeData.size === "" || themeData.size === undefined) {
      themeData.size = null;
    }
    if (themeData.bedType === "") {
      themeData.bedType = null;
    }

    const updated = await updateRoomTheme(req.params.id, themeData);
    if (!updated) return res.status(404).json({ message: "not found" });

    if (Array.isArray(images) && images.length > 0) {
      await RoomImage.destroy({ where: { RoomThemeId: req.params.id } });
      await Promise.all(
        images.map((imageUrl, index) =>
          RoomImage.create({
            RoomThemeId: req.params.id,
            imageUrl,
            isPrimary: index === 0,
            orderIndex: index
          })
        )
      );
    }

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
    if (err.code === 'THEME_IN_USE') {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: "server error" });
  }
});

export default roomThemeRouter;
