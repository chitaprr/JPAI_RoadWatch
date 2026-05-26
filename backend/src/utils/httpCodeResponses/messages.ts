import respond from "./respond";
import { Response } from "express";
import { ZodError, ZodIssue } from "zod";

export const RESPONSE = (
  res: Response,
  message: string,
  status: number,
  data: object = {},
) => respond(res, message, status, data);

export const SUCCESS = (
  res: Response,
  message: string | undefined = undefined,
  data: object = {},
) => respond(res, message ?? "Success", 200, data);

export const CREATED = (
  res: Response,
  message: string | undefined = undefined,
  data: object = {},
) => respond(res, message ?? "Created", 201, { data });

export const BAD_REQUEST = (
  res: Response,
  message: string | undefined = undefined,
  data: object = {},
) => respond(res, message ?? "Bad request", 400, data);

export const MISSING_BODY_FIELDS = (
  res: Response,
  errors: Array<ZodIssue | ZodError> = [],
) => respond(res, "Some body fields are missing or invalid", 400, { errors });

export const MISSING_QUERY_PARAMS = (
  res: Response,
  errors: Array<ZodIssue | ZodError> = [],
) => respond(res, "Some query params are missing or invalid", 400, { errors });

export const VALIDATION_ERROR = (
  res: Response,
  errors: Array<ZodIssue | ZodError> = [],
) => respond(res, "Validation error", 400, { errors });

export const UNAUTHORIZED = (
  res: Response,
  message: string | undefined = undefined,
  data: object = {},
) => respond(res, message ?? "Unauthorized", 401, data);

export const FORBIDDEN = (
  res: Response,
  message: string | undefined = undefined,
  data: object = {},
) => respond(res, message ?? "Forbidden", 403, data);

export const NOT_FOUND = (
  res: Response,
  message: string | undefined = undefined,
  data: object = {},
) => respond(res, message ?? "Not found", 404, data);

export const CONFLICT = (
  res: Response,
  message: string | undefined = undefined,
  data: object = {},
) => respond(res, message ?? "Conflict", 409, data);

export const SERVER_ERROR = (
  res: Response,
  message: string | undefined = undefined,
  data: object = {},
) => respond(res, message ?? "Server error", 500, data);
