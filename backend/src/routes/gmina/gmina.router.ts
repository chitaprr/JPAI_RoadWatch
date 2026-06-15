import { Router } from "express";
import { getGminy } from "./gmina.controller";

const gminaRouter = Router();

// Publiczne (bez auth) — lista potrzebna m.in. gościom w formularzu zgłoszenia.
gminaRouter.get("/", getGminy);

export default gminaRouter;
