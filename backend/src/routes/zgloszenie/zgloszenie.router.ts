import { Router } from "express";
import {
  createZgloszenie,
  getZgloszenia,
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

// Odczyt i operacje triażu — tylko dla zalogowanych.
zgloszenieRouter.get("/", authenticateJWT, getZgloszenia);
zgloszenieRouter.get("/:id", authenticateJWT, getZgloszenieById);
zgloszenieRouter.patch("/:id", authenticateJWT, updateZgloszenie);
zgloszenieRouter.delete("/:id", authenticateJWT, deleteZgloszenie);

export default zgloszenieRouter;
