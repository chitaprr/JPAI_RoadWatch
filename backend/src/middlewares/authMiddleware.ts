import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../../config";
import { UNAUTHORIZED, FORBIDDEN } from "../utils/httpCodeResponses/messages";

const JWT_SECRET = config.JWT_SECRET!;

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    isSuperadmin: boolean;
  };
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    UNAUTHORIZED(res, "Brak autoryzacji. Wymagany token JWT.");
    return;
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      FORBIDDEN(res, "Token jest niepoprawny lub wygasł.");
      return;
    }

    req.user = decoded as AuthenticatedRequest["user"];
    next();
  });
};
