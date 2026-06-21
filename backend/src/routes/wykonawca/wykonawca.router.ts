import { Router } from "express";
import {
  getWykonawcy,
  createWykonawca,
  updateWykonawca,
  deleteWykonawca,
} from "./wykonawca.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/authorize";
import { Rola } from "../../generated/prisma/client";

const wykonawcaRouter = Router();

// Odczyt — urzędnik (przypisanie do zgłoszenia), administrator gminy i superadmin.
wykonawcaRouter.get(
  "/",
  authenticateJWT,
  requireRole(Rola.URZEDNIK, Rola.ADMIN),
  getWykonawcy,
);

// Zarządzanie wykonawcami — administrator gminy (scoping w kontrolerze) lub superadmin.
wykonawcaRouter.post(
  "/",
  authenticateJWT,
  requireRole(Rola.ADMIN),
  createWykonawca,
);
wykonawcaRouter.patch(
  "/:id",
  authenticateJWT,
  requireRole(Rola.ADMIN),
  updateWykonawca,
);
wykonawcaRouter.delete(
  "/:id",
  authenticateJWT,
  requireRole(Rola.ADMIN),
  deleteWykonawca,
);

export default wykonawcaRouter;
