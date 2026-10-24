import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_request, response) => {
  response.json({
    status: "ok",
    service: "spcs-api",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;