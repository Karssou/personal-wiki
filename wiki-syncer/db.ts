import "dotenv/config";

import Database, { type Database as DatabaseType } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const STORAGE_DIR = process.env.STORAGE_DIR;

if (!STORAGE_DIR) {
  throw new Error("STORAGE_DIR is missing");
}

fs.mkdirSync(STORAGE_DIR, { recursive: true });

const dbPath = path.join(STORAGE_DIR, "sync.db");

export const db: DatabaseType = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
