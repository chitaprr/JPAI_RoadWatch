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
import { requireRole, requireSuperadmin } from "../../middlewares/authorize";
import { Rola } from "../../generated/prisma/client";
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

// Triaż — tylko urzędnik (scoping do swojej gminy w kontrolerze) i superadmin.
zgloszenieRouter.get(
  "/",
  authenticateJWT,
  requireRole(Rola.URZEDNIK),
  getZgloszenia,
);
zgloszenieRouter.get(
  "/:id",
  authenticateJWT,
  requireRole(Rola.URZEDNIK),
  getZgloszenieById,
);
zgloszenieRouter.patch(
  "/:id",
  authenticateJWT,
  requireRole(Rola.URZEDNIK),
  updateZgloszenie,
);
// Usuwanie — operacja destrukcyjna, tylko superadmin.
zgloszenieRouter.delete(
  "/:id",
  authenticateJWT,
  requireSuperadmin,
  deleteZgloszenie,
);

export default zgloszenieRouter;
