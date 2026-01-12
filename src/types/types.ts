import { languages } from "vscode";

export interface Heartbeat {
  id: string;
  timestamp: number;
  filePath: string;
  language: string;
  project: string;
  editor: string;
  branch: string;
  os: string;
}

export type EventType =
  | "edit"
  | "save"
  | "screenScrolling"
  | "switchFile"
  | "cursorMove"
  | "branchChange";

export interface ActivityState {
  lastActivity: number;
  lastSent: number;
  currentBranch: string;
  fullFileName: string;
  lastHeartbeat: Heartbeat | null;
  heartbeatBuffer: Heartbeat[];
  lastRegister: number;
  interval: NodeJS.Timeout | null;
}