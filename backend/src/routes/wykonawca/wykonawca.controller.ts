import { Response } from "express";
import { SUCCESS, SERVER_ERROR } from "../../utils/httpCodeResponses/messages";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import * as wykonawcaService from "./wykonawca.service";

// Lista wykonawców — używana w panelu do linkowania konta WYKONAWCA z firmą
// oraz do przypisywania zgłoszeń. Tylko superadmin (guard w routerze).
export const getWykonawcy = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const wykonawcy = await wykonawcaService.listWykonawcy();
    return SUCCESS(res, "Lista wykonawców", { wykonawcy });
  } catch {
    return SERVER_ERROR(
      res,
      "Wystąpił błąd serwera podczas pobierania wykonawców.",
    );
  }
};
