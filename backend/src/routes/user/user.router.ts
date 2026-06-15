import { Router } from "express";
import {
  getUsers,
  getMe,
  getUserById,
  updateUser,
  deleteUser,
} from "./user.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { requireSuperadmin } from "../../middlewares/authorize";

const userRouter = Router();

// Profil zalogowanego — musi być przed "/:id".
userRouter.get("/me", authenticateJWT, getMe);

// Zarządzanie użytkownikami — tylko superadmin.
userRouter.get("/", authenticateJWT, requireSuperadmin, getUsers);
userRouter.get("/:id", authenticateJWT, requireSuperadmin, getUserById);
userRouter.patch("/:id", authenticateJWT, requireSuperadmin, updateUser);
userRouter.delete("/:id", authenticateJWT, requireSuperadmin, deleteUser);

export default userRouter;
