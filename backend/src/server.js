import dotenv from "dotenv";
import app from "./app.js";
import { query } from "./db.js";
import { readDatasetRows, ingestRows } from "./services/datasetService.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // db.js already creates all tables on first connection — just ingest dataset
    const datasetPath = process.env.DATASET_PATH;
    if (datasetPath) {
      const rows = readDatasetRows(datasetPath);
      await ingestRows(rows);
      console.log(`Dataset ingested: ${rows.length} rows`);
    } else {
      console.warn("DATASET_PATH not set. Skip auto-ingestion.");
    }
  } catch (error) {
    console.error("Dataset bootstrap failed:", error.message);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the existing backend process, or set PORT to another value in backend/.env.`);
      process.exit(1);
    }
    throw error;
  });
}

bootstrap();
