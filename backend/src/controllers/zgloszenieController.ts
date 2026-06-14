import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma'; // Importujemy Twoją instancję z adapterem PG

const CreateZgloszenieSchema = z.object({
  userId: z.number().int().optional(),
  email: z.string().email(),
  title: z.string().min(3),
  description: z.string().min(5),
  lat: z.number(),
  lng: z.number(),
  priority: z.number().int().min(0).max(3).optional(),
});

const UpdateZgloszenieSchema = z.object({
  urzednikId: z.number().int().nullable().optional(),
  contractorId: z.number().int().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  status: z.string().optional(),
  deadline: z.string().datetime().nullable().optional().transform(val => val ? new Date(val) : null),
});

export const createZgloszenie = async (req: Request, res: Response) => {
  try {
    const validated = CreateZgloszenieSchema.parse(req.body);
    const zgloszenie = await prisma.zgloszenie.create({
      data: {
        userId: validated.userId || null,
        email: validated.email,
        title: validated.title,
        description: validated.description,
        lat: validated.lat,
        lng: validated.lng,
        priority: validated.priority ?? 0,
      },
    });
    res.status(201).json(zgloszenie);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: 'Błąd serwera podczas dodawania zgłoszenia' });
  }
};

export const getAllZgloszenia = async (req: Request, res: Response) => {
  try {
    const zgloszenia = await prisma.zgloszenie.findMany({
      include: { zdjecia: true } 
    });
    res.status(200).json(zgloszenia);
  } catch (error) {
    res.status(500).json({ error: 'Błąd serwera podczas pobierania zgłoszeń' });
  }
};

export const getZgloszenieById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const zgloszenie = await prisma.zgloszenie.findUnique({
      where: { id: Number(id) },
      include: { zdjecia: true, naprawy: true }
    });
    if (!zgloszenie) return res.status(404).json({ message: 'Nie znaleziono takiego zgłoszenia' });
    res.status(200).json(zgloszenie);
  } catch (error) {
    res.status(500).json({ error: 'Błąd serwera podczas pobierania zgłoszenia' });
  }
};

export const updateZgloszenie = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = UpdateZgloszenieSchema.parse(req.body);
    const updated = await prisma.zgloszenie.update({
      where: { id: Number(id) },
      data: validated,
    });
    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    if (error.code === 'P2025') return res.status(404).json({ message: 'Zgłoszenie nie istnieje' });
    res.status(500).json({ error: 'Błąd serwera podczas aktualizacji' });
  }
};

export const deleteZgloszenie = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.zgloszenie.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: 'Zgłoszenie zostało pomyślnie usunięte' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Nie znaleziono zgłoszenia' });
    res.status(500).json({ error: 'Błąd serwera podczas usuwania zgłoszenia' });
  }
};