import { Router } from "express";
import { HelloWorldHandler } from "./main.controller";
import userRouter from "./user/user.router";
import authRouter from "./auth/auth.router";
import zgloszenieRouter from "./zgloszenie/zgloszenie.router";

const router = Router();

router.use("/users", userRouter);
router.use("/auth", authRouter);
router.use("/zgloszenia", zgloszenieRouter);

router.get("/", HelloWorldHandler);

export default router;
