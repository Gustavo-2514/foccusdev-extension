import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database } from "sql.js";
import { ExtensionContext } from "vscode";
import { Heartbeat } from "../types/types";
import {
  DB_MAX_SIZE_DEFAULT_MB,
  DB_MAX_SIZE_MAX_MB,
  DB_MAX_SIZE_MIN_MB,
} from "../helpers/const";
import schema from "./schema";

export class LocalDatabase {
  private static instance: LocalDatabase;
  private db!: Database;
  private dbPath!: string;
  private SQL: any;
  private maxDatabaseSizeBytes: number = DB_MAX_SIZE_DEFAULT_MB * 1024 * 1024;

  private constructor() {}

  public static async init(context: ExtensionContext) {
    if (!LocalDatabase.instance) {
      const instance = new LocalDatabase();

      instance.SQL = await initSqlJs({
        locateFile: (file) =>
          path.join(context.extensionPath, "node_modules/sql.js/dist/", file),
      });

      const storagePath = context.globalStorageUri.fsPath;
      fs.mkdirSync(storagePath, { recursive: true });

      instance.dbPath = path.join(storagePath, "heartbeats.sqlite");

      if (fs.existsSync(instance.dbPath)) {
        const fileBuffer = fs.readFileSync(instance.dbPath);
        instance.db = new instance.SQL.Database(fileBuffer);
      } else {
        instance.db = new instance.SQL.Database();
        instance.db.exec(schema);
        instance.save();
      }

      LocalDatabase.instance = instance;
    }
    return LocalDatabase.instance;
  }

  public static get() {
    if (!LocalDatabase.instance) {
      throw new Error("LocalDatabase has not been initialized!");
    }
    return LocalDatabase.instance;
  }

  private save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  public setMaxDatabaseSizeMb(maxSizeMb: number) {
    const safeMaxSizeMb = this.clampMaxDatabaseSizeMb(maxSizeMb);
    this.maxDatabaseSizeBytes = safeMaxSizeMb * 1024 * 1024;
    this.enforceMaxDatabaseSize();
  }

  public clearAllHeartbeats() {
    this.resetDatabaseFile();
  }

  public getDatabaseSizeBytes(): number {
    try {
      return fs.statSync(this.dbPath).size;
    } catch {
      return 0;
    }
  }

  public getHeartbeatCount(): number {
    const result = this.db.exec(`
      SELECT COUNT(*) AS total
      FROM heartbeats
    `);

    if (!result[0] || !result[0].values[0]) {
      return 0;
    }

    return Number(result[0].values[0][0] ?? 0);
  }

  public getOldestHeartbeats(): Heartbeat[] {
    const result = this.db.exec(`
      SELECT id, timestamp, filePath, language, project, branch, source
      FROM heartbeats
      ORDER BY timestamp ASC
      LIMIT 50
    `);

    if (!result[0]) {
      return [];
    }

    const hbs = result[0].values.map((row: any[]) => ({
      id: row[0],
      timestamp: row[1],
      filePath: row[2],
      language: row[3],
      project: row[4],
      branch: row[5],
      source: row[6],
    }));

    return hbs;
  }

  public getAllHeartbeats(): Heartbeat[] {
    const result = this.db.exec(`
      SELECT id, timestamp, filePath, language, project, branch, source
      FROM heartbeats
      ORDER BY timestamp ASC
    `);

    if (!result[0]) {
      return [];
    }

    const hbs = result[0].values.map((row: any[]) => ({
      id: row[0],
      timestamp: row[1],
      filePath: row[2],
      language: row[3],
      project: row[4],
      branch: row[5],
      source: row[6],
    }));
    return hbs;
  }

  public getHeartbeatsAfterTimestamp(startTimestamp: number): Heartbeat[] {
    const safeStartTimestamp = Number.isFinite(startTimestamp)
      ? Math.max(0, Math.floor(startTimestamp))
      : 0;

    const result = this.db.exec(`
      SELECT id, timestamp, filePath, language, project, branch, source
      FROM heartbeats
      WHERE timestamp >= ${safeStartTimestamp}
      ORDER BY timestamp ASC
    `);

    if (!result[0]) {
      return [];
    }

    return result[0].values.map((row: any[]) => ({
      id: row[0],
      timestamp: row[1],
      filePath: row[2],
      language: row[3],
      project: row[4],
      branch: row[5],
      source: row[6],
    }));
  }

  public insertHeartbeat(heartbeats: Heartbeat[]) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO heartbeats (
        id,
        timestamp,
        filePath,
        language,
        project,
        branch,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const hb of heartbeats) {
      stmt.run([
        hb.id,
        hb.timestamp,
        hb.filePath,
        hb.language,
        hb.project,
        hb.branch,
        hb.source,
      ]);
    }

    stmt.free();
    this.save();
    this.enforceMaxDatabaseSize();
  }

  public deleteHeartbeatsByIds(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    const placeholders = ids.map(() => "?").join(",");
    this.db.run(`DELETE FROM heartbeats WHERE id IN (${placeholders})`, ids);
    this.save();
  }

  public close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }

  private clampMaxDatabaseSizeMb(sizeMb: number): number {
    if (!Number.isFinite(sizeMb)) {
      return DB_MAX_SIZE_DEFAULT_MB;
    }

    const normalized = Math.round(sizeMb);
    return Math.min(DB_MAX_SIZE_MAX_MB, Math.max(DB_MAX_SIZE_MIN_MB, normalized));
  }

  private enforceMaxDatabaseSize() {
    if (this.maxDatabaseSizeBytes <= 0) {
      return;
    }

    let currentSize = this.getDatabaseSizeBytes();
    let attempts = 0;

    while (currentSize > this.maxDatabaseSizeBytes && attempts < 200) {
      const deletedCount = this.deleteOldestHeartbeatsBatch(500);
      if (deletedCount === 0) {
        break;
      }

      this.save();
      currentSize = this.getDatabaseSizeBytes();
      attempts += 1;
    }
  }

  private deleteOldestHeartbeatsBatch(limit: number): number {
    const safeLimit = Math.max(1, Math.floor(limit));
    const result = this.db.exec(`
      SELECT id
      FROM heartbeats
      ORDER BY timestamp ASC
      LIMIT ${safeLimit}
    `);

    if (!result[0]) {
      return 0;
    }

    const ids = result[0].values
      .map((row: any[]) => String(row[0]))
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      return 0;
    }

    const placeholders = ids.map(() => "?").join(",");
    this.db.run(`DELETE FROM heartbeats WHERE id IN (${placeholders})`, ids);
    return ids.length;
  }

  private resetDatabaseFile() {
    try {
      if (this.db) {
        this.db.close();
      }
    } catch {
      // no-op
    }

    try {
      if (fs.existsSync(this.dbPath)) {
        fs.unlinkSync(this.dbPath);
      }
    } catch {
      // no-op
    }

    this.db = new this.SQL.Database();
    this.db.exec(schema);
    this.save();
  }
}
