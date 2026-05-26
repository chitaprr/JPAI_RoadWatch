import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_production';

// Rozszerzamy interfejs Request z Expressa, aby przechowywał dane zalogowanego użytkownika
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    isSuperadmin: boolean;
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Format nagłówka: "Bearer <TOKEN>"
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(403).json({ message: 'Token jest niepoprawny lub wygasł.' });
        return;
      }

      // Przypisujemy zdekodowane dane użytkownika do obiektu żądania (req)
      req.user = decoded as AuthenticatedRequest['user'];
      next(); // Przechodzimy do właściwego kontrolera
    });
  } else {
    // HTTP 401 Unauthorized w przypadku braku tokenu
    res.status(401).json({ message: 'Brak autoryzacji. Wymagany token JWT.' });
  }
};