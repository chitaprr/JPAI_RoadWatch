import { Router } from "express";
import { getPublicKey, subscribe, unsubscribe } from "./push.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";

const pushRouter = Router();

// Klucz publiczny VAPID — potrzebny przeglądarce do subskrypcji (publiczny).
pushRouter.get("/public-key", getPublicKey);

// Zapis/usuwanie subskrypcji — tylko zalogowani (push wiązany z kontem).
pushRouter.post("/subscribe", authenticateJWT, subscribe);
pushRouter.post("/unsubscribe", authenticateJWT, unsubscribe);

export default pushRouter;
