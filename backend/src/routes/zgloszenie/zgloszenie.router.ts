import { Router } from "express";
import {
  createZgloszenie,
  getZgloszenia,
  getMyZgloszenia,
  getZlecone,
  updateStatusByContractor,
  lookupZgloszenie,
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

// „Moje zgłoszenia" — każdy zalogowany widzi własne (po userId). Przed "/:id".
zgloszenieRouter.get("/moje", authenticateJWT, getMyZgloszenia);

// Lookup gościa po ID + email — publiczny. Przed "/:id".
zgloszenieRouter.get("/lookup", lookupZgloszenie);

// Wykonawca — lista zleceń jego firmy. Przed "/:id".
zgloszenieRouter.get(
  "/zlecone",
  authenticateJWT,
  requireRole(Rola.WYKONAWCA),
  getZlecone,
);

// Wykonawca — zmiana statusu własnego zlecenia (np. "W realizacji").
zgloszenieRouter.patch(
  "/:id/status",
  authenticateJWT,
  requireRole(Rola.WYKONAWCA),
  updateStatusByContractor,
);

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
