import { Router } from "express";
import { createZgloszenie } from "./zgloszenie.controller";
import { optionalAuth } from "../../middlewares/authMiddleware";
import upload from "../../middlewares/upload";

const zgloszenieRouter = Router();

// Otwarte dla gości (z emailem) oraz zalogowanych (przypięte do konta).
zgloszenieRouter.post(
  "/",
  optionalAuth,
  upload.array("zdjecia", 5),
  createZgloszenie,
);

export default zgloszenieRouter;
