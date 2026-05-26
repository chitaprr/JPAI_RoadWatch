import { Request, Response } from "express";
import { SUCCESS } from "../utils/httpCodeResponses/messages";

export const HelloWorldHandler = async (req: Request, res: Response) => {
  return SUCCESS(res, "RoadWatch API TEST", {
    apiVersion: "v1.0.0",
    ipAddress: req.ip,
  });
};
