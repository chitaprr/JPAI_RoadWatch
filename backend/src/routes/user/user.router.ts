import { Router } from "express";
import { getUsers, getMe } from "./user.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";

const userRouter = Router();

userRouter.get("/", getUsers);
userRouter.get("/me", authenticateJWT, getMe);

export default userRouter;
