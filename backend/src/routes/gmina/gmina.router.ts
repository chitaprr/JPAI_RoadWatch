import { Router } from "express";
import {
  getGminy,
  createGmina,
  updateGmina,
  deleteGmina,
} from "./gmina.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { requireSuperadmin } from "../../middlewares/authorize";

const gminaRouter = Router();

// Publiczne (bez auth) — lista potrzebna m.in. gościom w formularzu zgłoszenia.
gminaRouter.get("/", getGminy);

// Zarządzanie gminami — tylko superadmin.
gminaRouter.post("/", authenticateJWT, requireSuperadmin, createGmina);
gminaRouter.patch("/:id", authenticateJWT, requireSuperadmin, updateGmina);
gminaRouter.delete("/:id", authenticateJWT, requireSuperadmin, deleteGmina);

export default gminaRouter;
