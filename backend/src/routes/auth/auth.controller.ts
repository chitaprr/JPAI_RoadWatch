import { Request, Response } from "express";
import { z } from "zod";
import {
  CREATED,
  SUCCESS,
  BAD_REQUEST,
  UNAUTHORIZED,
  SERVER_ERROR,
  MISSING_BODY_FIELDS,
} from "../../utils/httpCodeResponses/messages";
import * as authService from "./auth.service";

export const registerSchema = z.object({
  email: z.email({ message: "Niepoprawny format adresu email" }),
  name: z.string().min(2, { message: "Imię musi mieć minimum 2 znaki" }),
  password: z.string().min(6, { message: "Hasło musi mieć minimum 6 znaków" }),
});

export const loginSchema = z.object({
  email: z.email({ message: "Niepoprawny format adresu email" }),
  password: z.string().min(1, { message: "Hasło jest wymagane" }),
});

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const userExists = await authService.findUserByEmail(parsed.data.email);
    if (userExists)
      return BAD_REQUEST(res, "Użytkownik o tym adresie email już istnieje.");

    const newUser = await authService.createUser(parsed.data);
    const token = authService.generateToken(newUser);
    return CREATED(res, "Użytkownik został pomyślnie zarejestrowany.", {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isSuperadmin: newUser.isSuperadmin,
      },
    });
  } catch {
    return SERVER_ERROR(res, "Wystąpił błąd serwera podczas rejestracji.");
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return MISSING_BODY_FIELDS(res, parsed.error.issues);

    const user = await authService.findUserByEmail(parsed.data.email);
    if (!user) return UNAUTHORIZED(res, "Nieprawidłowy email lub hasło.");

    const isPasswordValid = await authService.verifyPassword(
      parsed.data.password,
      user.password,
    );
    if (!isPasswordValid)
      return UNAUTHORIZED(res, "Nieprawidłowy email lub hasło.");

    const token = authService.generateToken(user);
    return SUCCESS(res, "Zalogowano pomyślnie.", {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperadmin: user.isSuperadmin,
      },
    });
  } catch {
    return SERVER_ERROR(res, "Wystąpił błąd serwera podczas logowania.");
  }
};
