import { Router } from "express";
import { getWykonawcy } from "./wykonawca.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/authorize";
import { Rola } from "../../generated/prisma/client";

const wykonawcaRouter = Router();

// Urzędnik (przypisuje wykonawcę do zgłoszenia) i superadmin.
wykonawcaRouter.get(
  "/",
  authenticateJWT,
  requireRole(Rola.URZEDNIK),
  getWykonawcy,
);

export default wykonawcaRouter;
