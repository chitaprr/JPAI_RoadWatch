import { Router } from "express";
import { HelloWorldHandler } from "./main.controller";
import userRouter from "./user/user.router";
import authRouter from "./auth/auth.router";
import zgloszenieRoutes from "./zgloszenieRoutes";

const router = Router();

router.use("/users", userRouter);
router.use("/auth", authRouter);

router.get("/", HelloWorldHandler);
router.use("/api/zgloszenia", zgloszenieRoutes);
export default router;
