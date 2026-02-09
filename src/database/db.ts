import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database } from "sql.js";
import { ExtensionContext } from "vscode";
import { Heartbeat } from "../types/types";
import schema from "./schema";

export class LocalDatabase {
  private static instance: LocalDatabase;
  private db!: Database;
  private dbPath!: string;
  private SQL: any;

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
    console.log("DB initialized ✅");
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

  public getOldestHeartbeats() {
    const result = this.db.exec(`
      SELECT id, timestamp, filePath, language, project, editor, branch, os, source
      FROM heartbeats
      ORDER BY timestamp ASC
      LIMIT 50
    `);

    if (!result[0]) return [];

    let hbs = result[0].values.map((row: any[]) => ({
      id: row[0],
      timestamp: row[1],
      filePath: row[2],
      language: row[3],
      project: row[4],
      editor: row[5],
      branch: row[6],
      os: row[7],
      source: row[8],
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
        editor,
        branch,
        os,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const hb of heartbeats) {
      stmt.run([
        hb.id,
        hb.timestamp,
        hb.filePath,
        hb.language,
        hb.project,
        hb.editor,
        hb.branch,
        hb.os,
        hb.source,
      ]);
    }

    stmt.free();
    this.save();
  }

  public deleteHeartbeatsByIds(ids: string[]) {
    if (ids.length === 0) return;

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
}
