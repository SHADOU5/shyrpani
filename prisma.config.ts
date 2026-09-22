import path from "node:path";
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "src/db/.env"), override: true });

export default defineConfig({
  schema: path.join(__dirname, "src/db/schema.prisma"),
});