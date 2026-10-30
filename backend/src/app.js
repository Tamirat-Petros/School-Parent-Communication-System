import cors from "cors";
import express from "express";
import helmet from "helmet";
import models from "./models/index.js";
import healthRouter from "./routes/health.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createUsersRouter } from "./routes/users.routes.js";
import { createClassesRouter } from "./routes/classes.routes.js";
import { createStudentsRouter } from "./routes/students.routes.js";
import { createAttendanceRouter } from "./routes/attendance.routes.js";
import { createGradesRouter } from "./routes/grades.routes.js";
import { createBehaviorRouter } from "./routes/behavior.routes.js";
import { createAnnouncementsRouter } from "./routes/announcements.routes.js";
import { createNotificationsRouter } from "./routes/notifications.routes.js";
import { createConversationsRouter } from "./routes/conversations.routes.js";
import { createReportsRouter } from "./routes/reports.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { HttpError } from "./utils/http-error.js";

export function createApp(options = {}) {
  const app = express();
  const activeModels = options.models ?? models;
  const env = options.env ?? process.env;
  const allowedOrigin = env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173";

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY === "true" ? 1 : false);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === allowedOrigin) return callback(null, true);
      return callback(new HttpError(403, "CORS_ORIGIN_DENIED", "This request origin is not allowed."));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }));
  app.use(express.text({ type: "text/csv", limit: "2mb" }));
  app.use(express.json({ limit: "256kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/auth", createAuthRouter(activeModels, env));
  app.use("/api/users", createUsersRouter(activeModels, env));
  app.use("/api/classes", createClassesRouter(activeModels, env));
  app.use("/api/students", createStudentsRouter(activeModels, env));
  app.use("/api/attendance", createAttendanceRouter(activeModels, env));
  app.use("/api/grades", createGradesRouter(activeModels, env));
  app.use("/api/behavior-reports", createBehaviorRouter(activeModels, env));
  app.use("/api/announcements", createAnnouncementsRouter(activeModels, env));
  app.use("/api/notifications", createNotificationsRouter(activeModels, env));
  app.use("/api/conversations", createConversationsRouter(activeModels, env));
  app.use("/api/reports", createReportsRouter(activeModels, env));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp();