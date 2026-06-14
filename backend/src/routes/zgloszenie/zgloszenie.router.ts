import { Router } from "express";
import {
  createZgloszenie,
  getZgloszenia,
  getPublicZgloszenia,
  getZgloszenieById,
  updateZgloszenie,
  deleteZgloszenie,
} from "./zgloszenie.controller";
import {
  authenticateJWT,
  optionalAuth,
} from "../../middlewares/authMiddleware";
import upload from "../../middlewares/upload";

const zgloszenieRouter = Router();

// Otwarte dla gości (z emailem) oraz zalogowanych (przypięte do konta).
zgloszenieRouter.post(
  "/",
  optionalAuth,
  upload.array("zdjecia", 5),
  createZgloszenie,
);

// Publiczna mapa — odczyt bez logowania. Musi być przed "/:id".
zgloszenieRouter.get("/public", getPublicZgloszenia);

// Odczyt i operacje triażu — tylko dla zalogowanych.
zgloszenieRouter.get("/", authenticateJWT, getZgloszenia);
zgloszenieRouter.get("/:id", authenticateJWT, getZgloszenieById);
zgloszenieRouter.patch("/:id", authenticateJWT, updateZgloszenie);
zgloszenieRouter.delete("/:id", authenticateJWT, deleteZgloszenie);

export default zgloszenieRouter;
