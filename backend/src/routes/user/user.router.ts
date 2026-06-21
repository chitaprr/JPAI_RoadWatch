import { Router } from "express";
import {
  getUsers,
  getMe,
  getUserById,
  updateUser,
  deleteUser,
} from "./user.controller";
import { authenticateJWT } from "../../middlewares/authMiddleware";
import { requireRole, requireSuperadmin } from "../../middlewares/authorize";
import { Rola } from "../../generated/prisma/client";

const userRouter = Router();

// Profil zalogowanego — musi być przed "/:id".
userRouter.get("/me", authenticateJWT, getMe);

// Lista i edycja — administrator gminy (scoping w kontrolerze) lub superadmin.
userRouter.get("/", authenticateJWT, requireRole(Rola.ADMIN), getUsers);
userRouter.patch("/:id", authenticateJWT, requireRole(Rola.ADMIN), updateUser);

// Podgląd pojedynczego konta i usuwanie — tylko superadmin.
userRouter.get("/:id", authenticateJWT, requireSuperadmin, getUserById);
userRouter.delete("/:id", authenticateJWT, requireSuperadmin, deleteUser);

export default userRouter;
