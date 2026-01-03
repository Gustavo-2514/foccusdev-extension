import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { ExtensionContext } from "vscode";
import { Heartbeat } from "../types/types";
import schema from "./schema";

export class LocalDatabase {
  private static instance: LocalDatabase;
  private db: Database.Database;

  private constructor(ctx: ExtensionContext) {
    const storagePath = ctx.globalStorageUri.fsPath;

    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
    const dbPath = path.join(storagePath, "foccusdev.db");
    this.db = new Database(dbPath);

    this.initializeSchema();
  }

  public static init(context: ExtensionContext) {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase(context);
    }
    return LocalDatabase.instance;
  }

  public static get() {
    if (!LocalDatabase.instance) {
      throw new Error("LocalDatabase has not been initialized!");
    }
    return LocalDatabase.instance;
  }

  private initializeSchema() {
    this.db.exec(schema);
  }

  public insertHeartbeat(hb: Heartbeat) {
    const stmt = this.db.prepare(`
        INSERT INTO heartbeats (id, timestamp, filePath, language, project, editor, branch, os, sent)
        VALUES (@id, @timestamp, @filePath, @language, @project, @editor, @branch, @os, @sent)
    `);
    stmt.run(hb);
  }

  public markAsSent(ids: string[]) {
    const stmt = this.db.prepare(`
        UPDATE heartbeats SET sent = 1 WHERE id = ?
    `);

    const tx = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        stmt.run(id);
      }
    });

    tx(ids);
  }
}
