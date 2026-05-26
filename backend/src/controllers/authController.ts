import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../../config';

const prisma = new PrismaClient();

// Definiujemy sekret dla JWT z konfiguracji (lub domyślny)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_production';

// Schematy walidacji danych za pomocą Zod (Wymóg walidacji po stronie serwera)
const registerSchema = z.object({
  email: z.string().email({ message: "Niepoprawny format adresu email" }),
  name: z.string().min(2, { message: "Imię musi mieć minimum 2 znaki" }),
  password: z.string().min(6, { message: "Hasło musi mieć minimum 6 znaków" }),
});

const loginSchema = z.object({
  email: z.string().email({ message: "Niepoprawny format adresu email" }),
  password: z.string().min(1, { message: "Hasło jest wymagane" }),
});

// 1. REJESTRACJA UŻYTKOWNIKA
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Walidacja inputu
    const validatedData = registerSchema.parse(req.body);

    // Sprawdzenie czy użytkownik już istnieje
    const userExists = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (userExists) {
      res.status(400).json({ message: 'Użytkownik o tym adresie email już istnieje.' });
      return;
    }

    // Hashowanie hasła (Wymóg bezpieczeństwa - Argon2/bcrypt)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Zapis do bazy danych
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword, // Zapisujemy bezpieczny hash, nigdy czysty tekst!
      }
    });

    // Prawidłowy kod HTTP 201 Created (Wymóg kodowania statusów)
    res.status(201).json({
      message: 'Użytkownik został pomyślnie zarejestrowany.',
      user: { id: newUser.id, email: newUser.email, name: newUser.name }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Używamy .flatten().fieldErrors, aby przesłać czytelne błędy dla konkretnych pól
      res.status(400).json({ errors: error.flatten().fieldErrors });
      return;
    }
    // Bezpieczna obsługa błędów - nie ujawniamy stack trace struktury serwera
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas rejestracji.' });
  }
};

// 2. LOGOWANIE UŻYTKOWNIKA (Bezstanowość - tokeny)
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Walidacja inputu
    const validatedData = loginSchema.parse(req.body);

    // Szukanie użytkownika w bazie
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      res.status(401).json({ message: 'Nieprawidłowy email lub hasło.' });
      return;
    }

    // Weryfikacja hashowanego hasła
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Nieprawidłowy email lub hasło.' });
      return;
    }

    // Generowanie tokenu JWT (Wymóg: Bezstanowość systemu)
    const token = jwt.sign(
      { userId: user.id, email: user.email, isSuperadmin: user.isSuperadmin },
      JWT_SECRET,
      { expiresIn: '24h' } // Token ważny przez 24 godziny
    );

    // HTTP 200 OK
    res.status(200).json({
      message: 'Zalogowano pomyślnie.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperadmin: user.isSuperadmin
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas logowania.' });
  }
};