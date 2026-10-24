import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = Number(process.env.PORT ?? 5000);

try {
  if (process.env.MONGODB_URI) {
    await connectDatabase(process.env.MONGODB_URI);
  } else {
    console.warn("MONGODB_URI is not set. The API will start without database access.");
  }

  app.listen(port, "127.0.0.1", () => {
    console.log("SPCS API listening at http://127.0.0.1:" + port);
  });
} catch (error) {
  console.error("Could not connect to MongoDB:", error.message);
  process.exitCode = 1;
}