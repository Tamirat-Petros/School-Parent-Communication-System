import "dotenv/config";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { getJwtSecret } from "./config/security.js";

const port = Number(process.env.PORT ?? 5000);
const host = process.env.HOST ?? "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";

async function start() {
  if (isProduction) {
    getJwtSecret(process.env);
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be configured in production.");
    if (!/^[a-f0-9]{64}$/i.test(process.env.MFA_ENCRYPTION_KEY ?? "")) {
      throw new Error("MFA_ENCRYPTION_KEY must be a 32-byte hexadecimal value in production.");
    }
    if (!process.env.CLIENT_ORIGIN) throw new Error("CLIENT_ORIGIN must be configured in production.");
  }

  if (process.env.MONGODB_URI) {
    await connectDatabase(process.env.MONGODB_URI);
  } else {
    console.warn("MONGODB_URI is not set. Database-backed routes are unavailable.");
  }

  const server = app.listen(port, host, () => {
    console.log("SPCS API listening at http://" + host + ":" + port);
  });

  const shutdown = async () => {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Could not start the SPCS API:", error.message);
  process.exitCode = 1;
});