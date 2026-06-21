import { Router } from "express";
import { createNaprawa } from "./naprawa.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/authorize";
import { Rola } from "../../generated/prisma/client";
import upload from "../../middlewares/upload";

const naprawaRouter = Router();

// Wykonawca dodaje naprawę (multipart/form-data, zdjęcia w polu "zdjecia").
naprawaRouter.post(
  "/",
  authenticateJWT,
  requireRole(Rola.WYKONAWCA),
  upload.array("zdjecia", 5),
  createNaprawa,
);

export default naprawaRouter;
