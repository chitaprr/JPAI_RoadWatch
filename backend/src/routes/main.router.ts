import { Router } from "express";
import { HelloWorldHandler } from "./main.controller";
import userRouter from "./user/user.router";
import authRouter from "./auth/auth.router";
import zgloszenieRouter from "./zgloszenie/zgloszenie.router";
import gminaRouter from "./gmina/gmina.router";
import wykonawcaRouter from "./wykonawca/wykonawca.router";
import naprawaRouter from "./naprawa/naprawa.router";

const router = Router();

router.use("/users", userRouter);
router.use("/auth", authRouter);
router.use("/zgloszenia", zgloszenieRouter);
router.use("/gminy", gminaRouter);
router.use("/wykonawcy", wykonawcaRouter);
router.use("/naprawy", naprawaRouter);

router.get("/", HelloWorldHandler);

export default router;
