import "dotenv/config";

import { XMLParser } from "fast-xml-parser";
import { open } from "node:fs/promises";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "./db.ts";

// Configuration

const {
  NEXTCLOUD_BASE_URL,
  NEXTCLOUD_USERNAME,
  NEXTCLOUD_APP_PASSWORD,
  NEXTCLOUD_REMOTE_DIR,
  STORAGE_DIR,
} = process.env;

if (
  !NEXTCLOUD_BASE_URL ||
  !NEXTCLOUD_USERNAME ||
  !NEXTCLOUD_APP_PASSWORD ||
  !NEXTCLOUD_REMOTE_DIR ||
  !STORAGE_DIR
) {
  throw new Error("Missing environment variables");
}

const BASE_URL = new URL(NEXTCLOUD_BASE_URL);

if (!['http:', 'https:'].includes(BASE_URL.protocol) || BASE_URL.search || BASE_URL.hash) {
  throw new Error('NEXTCLOUD_BASE_URL must be an HTTP(S) URL without query parameters');
}

function splitPath(pathname: string): string[] {
  return pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
}

function createRemoteUrl(...segments: string[]): URL {
  const url = new URL(BASE_URL);
  const pathSegments = [...splitPath(BASE_URL.pathname), ...segments.filter(Boolean)];
  url.pathname = `/${pathSegments.map((segment) => encodeURIComponent(segment)).join('/')}/`;
  url.search = '';
  url.hash = '';
  return url;
}

const ROOT_URL = createRemoteUrl(...splitPath(NEXTCLOUD_REMOTE_DIR));

const DOCUMENTS_DIR = path.join(STORAGE_DIR, "documents");

const rawDownloadConcurrency = process.env.DOWNLOAD_CONCURRENCY ?? "4";
const DOWNLOAD_CONCURRENCY = Number(rawDownloadConcurrency);

function readTimeout(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);

  if (!Number.isInteger(value) || value < 1_000 || value > 600_000) {
    throw new Error(`${name} must be an integer between 1000 and 600000`);
  }

  return value;
}

const SCAN_TIMEOUT_MS = readTimeout("SCAN_TIMEOUT_MS", 30_000);
const DOWNLOAD_TIMEOUT_MS = readTimeout("DOWNLOAD_TIMEOUT_MS", 120_000);

if (
  !Number.isInteger(DOWNLOAD_CONCURRENCY) ||
  DOWNLOAD_CONCURRENCY < 1 ||
  DOWNLOAD_CONCURRENCY > 32
) {
  throw new Error("DOWNLOAD_CONCURRENCY must be an integer between 1 and 32");
}

const AUTHORIZATION =
  "Basic " +
  Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_APP_PASSWORD}`).toString(
    "base64",
  );

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL: LogLevel = process.env.LOG_LEVEL === "debug" ? "debug" : "info";
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function log(level: LogLevel, scope: string, message: string, details?: unknown): void {
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[LOG_LEVEL]) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${scope}]`;

  if (details === undefined) {
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
      `${prefix} ${message}`,
    );
    return;
  }

  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
    `${prefix} ${message}`,
    details,
  );
}

function logError(scope: string, message: string, error: unknown): void {
  log("error", scope, `${message}: ${errorMessage(error)}`);

  if (LOG_LEVEL === "debug" && error instanceof Error && error.stack) {
    log("debug", scope, error.stack);
  }
}

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: true,
  isArray: (name) => {
    return name === "response" || name === "propstat";
  },
});

type XmlRecord = Record<string, unknown>;

interface WebDavResponse {
  href: string;
  propstat: XmlRecord[];
}

interface RemoteMetadata {
  href: string;
  etag: string | null;
  size: number;
  mimeType: string | null;
  lastModified: string | null;
  isDirectory: boolean;
}

interface RemoteFile extends RemoteMetadata {
  relativePath: string;
}

interface SyncedFileRow {
  etag: string;
  size: number | null;
  local_path: string;
}

interface SyncResult {
  downloaded: number;
  failed: number;
}

function asRecord(value: unknown): XmlRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as XmlRecord
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function asRecords(value: unknown): XmlRecord[] {
  const values = Array.isArray(value) ? value : [value];
  return values.map(asRecord).filter((item): item is XmlRecord => item !== undefined);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
    <d:prop>
        <d:getetag />
        <d:getcontentlength />
        <d:getcontenttype />
        <d:getlastmodified />
        <d:resourcetype />
    </d:prop>
</d:propfind>`;

async function propfind(url: URL): Promise<WebDavResponse[]> {
  const startedAt = performance.now();
  log("debug", "WEBDAV", `PROPFIND ${url.pathname}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(url, {
      method: "PROPFIND",
      headers: {
        Authorization: AUTHORIZATION,
        Depth: "1",
        "Content-Type": "application/xml",
      },
      body: PROPFIND_BODY,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new Error(`PROPFIND timeout après ${SCAN_TIMEOUT_MS} ms pour ${url.pathname}`);
    }
    throw new Error(`PROPFIND request failed for ${url.pathname}: ${errorMessage(error)}`);
  }

  if (!response.ok) {
    throw new Error(
      `PROPFIND failed for ${url.pathname}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  let xml: string;
  try {
    xml = await response.text();
  } catch (error) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new Error(`PROPFIND timeout après ${SCAN_TIMEOUT_MS} ms pour ${url.pathname}`);
    }
    throw new Error(`PROPFIND response failed for ${url.pathname}: ${errorMessage(error)}`);
  }
  clearTimeout(timeout);

  const parsed = asRecord(parser.parse(xml) as unknown);
  const multistatus = asRecord(parsed?.multistatus);
  const responses = asRecords(multistatus?.response);

  if (responses.length === 0) {
    throw new Error(`Invalid WebDAV XML response for ${url.pathname}`);
  }

  log("debug", "WEBDAV", `PROPFIND terminé: ${responses.length} réponse(s) (${formatDuration(performance.now() - startedAt)})`);

  return responses.map((response) => {
    const href = asString(response.href);
    const propstat = asRecords(response.propstat);

    if (!href || propstat.length === 0) {
      throw new Error('Invalid WebDAV response entry');
    }

    return { href, propstat };
  });
}

function extractMetadata(response: WebDavResponse): RemoteMetadata {
  const successfulPropstat = response.propstat.find((item) =>
    asString(item.status)?.includes(" 200 "),
  );

  if (!successfulPropstat) {
    throw new Error("No successful PROPFIND propstat");
  }

  const prop = asRecord(successfulPropstat.prop);
  if (!prop) throw new Error('Invalid PROPFIND properties');

  const isDirectory = asRecord(prop.resourcetype)?.collection !== undefined;
  const rawSize = Number(asString(prop.getcontentlength) ?? 0);
  const href = response.href;

  return {
    href,
    etag: asString(prop.getetag) ?? null,
    size: Number.isFinite(rawSize) && rawSize >= 0 ? rawSize : 0,
    mimeType: asString(prop.getcontenttype) ?? null,
    lastModified: asString(prop.getlastmodified) ?? null,
    isDirectory,
  };
}

function resolveRemoteUrl(href: string): URL {
  const url = new URL(href, ROOT_URL);

  if (url.origin !== ROOT_URL.origin || url.protocol !== ROOT_URL.protocol || url.search || url.hash) {
    throw new Error("Unexpected WebDAV host");
  }
  return url;
}

function getRelativePath(href: string): string {
  const url = resolveRemoteUrl(href);

  const rootSegments = splitPath(ROOT_URL.pathname);
  const fileSegments = splitPath(url.pathname);

  if (rootSegments.some((segment, index) => fileSegments[index] !== segment)) {
    throw new Error("Path outside synchronized directory");
  }

  const relativeSegments = fileSegments.slice(rootSegments.length);

  if (
    relativeSegments.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\"),
    )
  ) {
    throw new Error("Unsafe remote path");
  }

  return relativeSegments.join("/");
}

interface ScanResult {
  files: RemoteFile[];
  failed: number;
}

async function listRemoteFiles(
  directoryUrl: URL,
  files: RemoteFile[] = [],
  visited = new Set<string>(),
  isRoot = true,
): Promise<ScanResult> {
  const directoryKey = directoryUrl.pathname;

  if (visited.has(directoryKey)) {
    log("warn", "SCAN", `Dossier déjà visité, ignoré: ${directoryKey}`);
    return { files, failed: 1 };
  }

  visited.add(directoryKey);
  log("debug", "SCAN", `Analyse du dossier distant ${directoryUrl.pathname}`);
  let responses: WebDavResponse[];

  try {
    responses = await propfind(directoryUrl);
  } catch (error) {
    if (isRoot) throw error;
    logError("SCAN", `Impossible de lire le dossier ${directoryUrl.pathname}`, error);
    return { files, failed: 1 };
  }

  let failed = 0;

  for (const response of responses) {
    let metadata: RemoteMetadata;

    try {
      metadata = extractMetadata(response);
    } catch (error) {
      failed++;
      logError("SCAN", `Réponse WebDAV ignorée dans ${directoryUrl.pathname}`, error);
      continue;
    }

    let relativePath: string;

    try {
      relativePath = getRelativePath(metadata.href);
    } catch (error) {
      failed++;
      logError("SCAN", `Chemin distant ignoré dans ${directoryUrl.pathname}`, error);
      continue;
    }

    // Nextcloud renvoie aussi le dossier lui-même.
    if (!relativePath) {
      continue;
    }

    if (metadata.isDirectory) {
      const childUrl = resolveRemoteUrl(metadata.href);

      if (!childUrl.pathname.endsWith("/")) {
        childUrl.pathname += "/";
      }

      try {
        const childResult = await listRemoteFiles(childUrl, files, visited, false);
        failed += childResult.failed;
      } catch (error) {
        failed++;
        logError("SCAN", `Dossier ignoré après erreur ${childUrl.pathname}`, error);
      }

      continue;
    }

    files.push({
      ...metadata,
      relativePath,
    });
  }

  return { files, failed };
}

async function downloadFile(file: RemoteFile): Promise<string> {
  const startedAt = performance.now();
  const remoteUrl = resolveRemoteUrl(file.href);
  // Revalide aussi le chemin au moment du téléchargement : cette fonction
  // constitue la frontière entre une URL distante et le système de fichiers.
  getRelativePath(file.href);

  const response = await fetch(remoteUrl, {
    headers: {
      Authorization: AUTHORIZATION,
    },

    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `GET failed for ${file.relativePath}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  log("debug", "DOWNLOAD", `Téléchargement de ${file.relativePath} (${file.size} octets)`);

  const buffer = Buffer.from(await response.arrayBuffer());

  // Vérification de la taille annoncée par le serveur.
  if (file.size > 0 && buffer.length !== file.size) {
    throw new Error(
      `Incomplete download: expected ${file.size}, received ${buffer.length}`,
    );
  }

  const destination = path.resolve(DOCUMENTS_DIR, file.relativePath);

  const relative = path.relative(DOCUMENTS_DIR, destination);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Unsafe local destination");
  }

  await fs.mkdir(path.dirname(destination), {
    recursive: true,
  });

  // Téléchargement temporaire avant remplacement du fichier.
  const temporaryPath = `${destination}.${process.pid}.tmp`;

  try {
    await fs.writeFile(temporaryPath, buffer, {
      flag: "wx",
    });

    await fs.rename(temporaryPath, destination);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }

  log("debug", "DOWNLOAD", `Fichier écrit: ${file.relativePath} (${formatDuration(performance.now() - startedAt)})`);

  return destination;
}

function getVersionKey(file: RemoteFile): string {
  return file.etag ?? `${file.lastModified ?? "unknown"}:${file.size}`;
}

async function synchronizeFiles(files: RemoteFile[]): Promise<SyncResult> {
  let downloaded = 0;
  let failed = 0;
  let unchanged = 0;

  const findFile = db.prepare(`
        SELECT etag, size, local_path
        FROM synced_files
        WHERE remote_path = ?
    `);

  const saveFile = db.prepare(`
        INSERT INTO synced_files (
            remote_path,
            etag,
            size,
            mime_type,
            last_modified,
            local_path,
            synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(remote_path) DO UPDATE SET
            etag = excluded.etag,
            size = excluded.size,
            mime_type = excluded.mime_type,
            last_modified = excluded.last_modified,
            local_path = excluded.local_path,
            synced_at = excluded.synced_at
    `);

  // La comparaison reste légère et séquentielle, puis seuls les fichiers
  // réellement nécessaires sont placés dans le pool de téléchargements.
  const filesToDownload: RemoteFile[] = [];

  for (const file of files) {
    const existing = findFile.get(file.relativePath) as SyncedFileRow | undefined;

    const localPath = path.join(DOCUMENTS_DIR, file.relativePath);

    const version = getVersionKey(file);

    let localExists = false;

    try {
      await fs.access(localPath);
      localExists = true;
    } catch {
      localExists = false;
    }

    if (existing && existing.etag === version && localExists) {
      unchanged++;
      continue;
    }

    filesToDownload.push(file);
  }

  log(
    "info",
    "COMPARE",
    `${unchanged} fichier(s) déjà à jour, ${filesToDownload.length} à télécharger (concurrence: ${DOWNLOAD_CONCURRENCY})`,
  );

  if (filesToDownload.length === 0) {
    return { downloaded, failed };
  }

  let nextFileIndex = 0;

  async function downloadWorker(): Promise<void> {
    while (nextFileIndex < filesToDownload.length) {
      const file = filesToDownload[nextFileIndex++];
      const version = getVersionKey(file);

      try {
        const destination = await downloadFile(file);

        saveFile.run(
          file.relativePath,
          version,
          file.size,
          file.mimeType,
          file.lastModified,
          destination,
          new Date().toISOString(),
        );

        downloaded++;

        log("info", "DOWNLOAD", `${downloaded}/${filesToDownload.length} terminé: ${file.relativePath}`);
      } catch (error) {
        failed++;
        logError("DOWNLOAD", `${file.relativePath} a échoué`, error);
      }
    }
  }

  const workerCount = Math.min(DOWNLOAD_CONCURRENCY, filesToDownload.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => downloadWorker()),
  );

  return { downloaded, failed };
}

export async function syncNextcloud(): Promise<void> {
  const syncStartedAt = performance.now();
  const lockPath = path.join(STORAGE_DIR, ".sync.lock");

  let lock: Awaited<ReturnType<typeof open>>;

  try {
    lock = await open(lockPath, "wx");
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === "EEXIST") {
      log("warn", "LOCK", "Synchronisation ignorée : une autre synchronisation est déjà en cours");
      return;
    }

    throw error;
  }

  const startedAt = new Date().toISOString();

  const run = db.prepare(`
        INSERT INTO sync_runs (started_at, status)
        VALUES (?, 'running')
    `);

  const runId = run.run(startedAt).lastInsertRowid;

  try {
    log("info", "SYNC", "Démarrage de la synchronisation Nextcloud");
    log("info", "CONFIG", `Dossier distant: ${ROOT_URL.pathname} | stockage local: ${DOCUMENTS_DIR}`);
    log("info", "CONFIG", `Journalisation: ${LOG_LEVEL} | concurrence téléchargements: ${DOWNLOAD_CONCURRENCY}`);

    log("info", "PREPARE", "Création/vérification du dossier local");
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });

    // 1. Récupération de toute l'arborescence
    const scanStartedAt = performance.now();
    log("info", "SCAN", "Récupération de l'arborescence distante");
    const scanResult = await listRemoteFiles(ROOT_URL);
    const files = scanResult.files;

    log(
      scanResult.failed > 0 ? "warn" : "info",
      "SCAN",
      `${files.length} fichier(s) trouvé(s)${scanResult.failed > 0 ? `, ${scanResult.failed} erreur(s)` : ""} (${formatDuration(performance.now() - scanStartedAt)})`,
    );

    // 2. Comparaison et téléchargement
    log("info", "COMPARE", "Comparaison avec la base locale et les fichiers présents sur disque");
    const downloadStartedAt = performance.now();
    const result = await synchronizeFiles(files);
    log("info", "DOWNLOAD", `Phase de téléchargement terminée en ${formatDuration(performance.now() - downloadStartedAt)}`);

    const totalFailures = result.failed + scanResult.failed;
    const status = totalFailures > 0 ? "partial" : "success";

    db.prepare(
      `
            UPDATE sync_runs
            SET
                completed_at = ?,
                status = ?,
                files_scanned = ?,
                files_downloaded = ?,
                files_failed = ?
            WHERE id = ?
        `,
    ).run(
      new Date().toISOString(),
      status,
      files.length,
      result.downloaded,
      totalFailures,
      runId,
    );

    log(
      result.failed > 0 ? "warn" : "info",
      "SYNC",
      `Synchronisation terminée: ${result.downloaded} téléchargé(s), ${totalFailures} échec(s), durée totale ${formatDuration(performance.now() - syncStartedAt)}`,
    );
  } catch (error) {
    logError("SYNC", "Synchronisation interrompue", error);

    db.prepare(
      `
            UPDATE sync_runs
            SET
                completed_at = ?,
                status = 'failed',
                error_message = ?
            WHERE id = ?
        `,
    ).run(new Date().toISOString(), errorMessage(error), runId);
  } finally {
    await lock.close();
    await fs.rm(lockPath, { force: true });
  }
}

// Permet aussi d'exécuter directement ce fichier.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await syncNextcloud();
  } finally {
    db.close();
  }
}
