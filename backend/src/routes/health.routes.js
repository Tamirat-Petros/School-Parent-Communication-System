import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

function databaseStatus() {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}

router.get("/", (_request, response) => {
  response.json({
    status: "ok",
    service: "spcs-api",
    database: databaseStatus(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/ready", (_request, response) => {
  const connected = databaseStatus() === "connected";
  response.status(connected ? 200 : 503).json({
    status: connected ? "ready" : "not_ready",
    service: "spcs-api",
    database: databaseStatus(),
  });
});

export default router;