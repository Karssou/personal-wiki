import { db } from './db.ts';

db.exec(`
    CREATE TABLE IF NOT EXISTS synced_files (
        remote_path TEXT PRIMARY KEY,
        etag TEXT NOT NULL,
        size INTEGER,
        mime_type TEXT,
        last_modified TEXT,
        local_path TEXT NOT NULL,
        synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL,
        files_scanned INTEGER DEFAULT 0,
        files_downloaded INTEGER DEFAULT 0,
        files_failed INTEGER DEFAULT 0,
        error_message TEXT
    );
`);

console.log('Database initialized successfully');

db.close();