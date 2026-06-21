import { Router } from "express";
import {
  getWykonawcy,
  createWykonawca,
  updateWykonawca,
  deleteWykonawca,
} from "./wykonawca.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { requireRole, requireSuperadmin } from "../../middlewares/authorize";
import { Rola } from "../../generated/prisma/client";

const wykonawcaRouter = Router();

// Odczyt — urzędnik (przypisanie do zgłoszenia) i superadmin.
wykonawcaRouter.get(
  "/",
  authenticateJWT,
  requireRole(Rola.URZEDNIK),
  getWykonawcy,
);

// Zarządzanie wykonawcami — tylko superadmin.
wykonawcaRouter.post("/", authenticateJWT, requireSuperadmin, createWykonawca);
wykonawcaRouter.patch(
  "/:id",
  authenticateJWT,
  requireSuperadmin,
  updateWykonawca,
);
wykonawcaRouter.delete(
  "/:id",
  authenticateJWT,
  requireSuperadmin,
  deleteWykonawca,
);

export default wykonawcaRouter;
