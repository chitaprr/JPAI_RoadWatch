import { Request, Response } from "express";
import { SUCCESS, SERVER_ERROR } from "../../utils/httpCodeResponses/messages";
import * as gminaService from "./gmina.service";

// Publiczna lista gmin — używana w formularzu zgłoszenia (także przez gościa)
// oraz w panelu superadmina przy przypisywaniu gminy urzędnikowi.
export const getGminy = async (_req: Request, res: Response) => {
  try {
    const gminy = await gminaService.listGminy();
    return SUCCESS(res, "Lista gmin", { gminy });
  } catch {
    return SERVER_ERROR(res, "Wystąpił błąd serwera podczas pobierania gmin.");
  }
};
