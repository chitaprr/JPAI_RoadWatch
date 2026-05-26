import { Response } from "express";
import { SUCCESS, NOT_FOUND } from "../../utils/httpCodeResponses/messages";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import * as userService from "./user.service";

export const getUsers = async (_req: AuthenticatedRequest, res: Response) => {
  const users = await userService.listUsers();
  return SUCCESS(res, "Users", { users });
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.findUserById(req.user!.userId);
  if (!user) return NOT_FOUND(res, "Użytkownik nie znaleziony.");
  return SUCCESS(res, "Profil użytkownika", { user });
};
