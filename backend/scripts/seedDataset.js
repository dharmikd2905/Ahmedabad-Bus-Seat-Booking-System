import dotenv from "dotenv";
import { readDatasetRows, ingestRows } from "../src/services/datasetService.js";

dotenv.config();

async function run() {
  const filePath = process.env.DATASET_PATH || "./data/dataset.csv";
  const rows = readDatasetRows(filePath);
  await ingestRows(rows);
  console.log(`Seed complete. Imported ${rows.length} rows from ${filePath}`);
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
