import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import swaggerUi from "swagger-ui-express";
import router from "./routes/main.router";
import requestLogger from "./middlewares/requestLogger";
import { UPLOAD_DIR, UPLOAD_ROUTE_PREFIX } from "./middlewares/upload";
import { NOT_FOUND } from "./utils/httpCodeResponses/messages";
import { openApiDocument } from "./docs/openapi";
import config from "../config";

const app = express();
const httpServer = http.createServer(app);

app.use(
  cors({
    origin: config.ALLOWED_ORIGINS.map((origin) => new RegExp(`^${origin}`)),
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use(requestLogger);

app.use(UPLOAD_ROUTE_PREFIX, express.static(UPLOAD_DIR));

// Dokumentacja API (Swagger UI + surowa specyfikacja). Wyłączona na produkcji.
if (!config.PRODUCTION) {
  app.get("/openapi.json", (_req, res) => res.json(openApiDocument));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

app.use("/", router);

app.use((_req, res) => NOT_FOUND(res));

export default httpServer;
