import * as vscode from "vscode";
import { LocalDatabase } from "../database/db.js";
import {
  EFFECTIVE_HEARTBEAT_SECONDS_LIMIT,
  TRAILING_HEARTBEAT_SECONDS,
} from "../helpers/const.js";
import { Heartbeat } from "../types/types.js";

const STATUS_BAR_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_STATUS_TEXT = "0 mins de código";
const OPEN_DASHBOARD_COMMAND = "foccusdev.openDashboard";

export class DailyCodingStatusBar implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBarItem.name = "FoccusDEV Tempo Diário";
    this.statusBarItem.tooltip = "Tempo total de código registrado hoje";
    this.statusBarItem.command = OPEN_DASHBOARD_COMMAND;
    this.statusBarItem.text = DEFAULT_STATUS_TEXT;
  }

  public start() {
    this.statusBarItem.show();
    this.refresh();

    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, STATUS_BAR_REFRESH_INTERVAL_MS);
  }

  public dispose() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    this.statusBarItem.dispose();
  }

  private refresh() {
    try {
      const startOfDayTimestamp = this.getStartOfDayTimestamp();
      const heartbeats = LocalDatabase.get().getHeartbeatsAfterTimestamp(
        startOfDayTimestamp,
      );
      const totalSeconds = this.calculateDailySeconds(heartbeats);

      this.statusBarItem.text = this.formatStatusText(totalSeconds);
    } catch {
      this.statusBarItem.text = DEFAULT_STATUS_TEXT;
    }
  }

  private calculateDailySeconds(heartbeats: Heartbeat[]): number {
    if (heartbeats.length === 0) {
      return 0;
    }

    let totalSeconds = 0;

    for (let index = 0; index < heartbeats.length; index += 1) {
      const current = heartbeats[index];
      const next = heartbeats[index + 1];

      if (!next) {
        totalSeconds += TRAILING_HEARTBEAT_SECONDS;
        continue;
      }

      const delta = next.timestamp - current.timestamp;
      if (delta <= 0) {
        continue;
      }

      totalSeconds += Math.min(delta, EFFECTIVE_HEARTBEAT_SECONDS_LIMIT);
    }

    return totalSeconds;
  }

  private formatStatusText(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const totalMinutes = Math.floor(safeSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${totalMinutes} mins de código`;
    }

    return `${hours}hrs, ${minutes} mins de código`;
  }

  private getStartOfDayTimestamp(): number {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor(startOfDay.getTime() / 1000);
  }
}
