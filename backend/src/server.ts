import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import router from "./routes/main.router";
import requestLogger from "./middlewares/requestLogger";
import { NOT_FOUND } from "./utils/httpCodeResponses/messages";
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

app.use("/", router);

app.use((_req, res) => NOT_FOUND(res));

export default httpServer;
