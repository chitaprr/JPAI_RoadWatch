import { Router } from "express";
import { HelloWorldHandler } from "./main.controller";
import userRouter from "./user/user.router";
import authRouter from "./auth/auth.router";

const router = Router();

router.use("/users", userRouter);
router.use("/auth", authRouter);

router.get("/", HelloWorldHandler);

export default router;
