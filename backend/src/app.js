import cors from "cors";
import express from "express";
import helmet from "helmet";
import healthRouter from "./routes/health.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173" }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter);
app.use(notFound);
app.use(errorHandler);

export default app;