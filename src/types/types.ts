export type SourceType = "human" | "ai" | "debugging";

export interface Heartbeat {
  id: string;
  timestamp: number;
  filePath: string;
  language: string;
  project: string;
  editor: string;
  branch: string;
  os: string;
  source: SourceType;
}

export interface ActivityStateInterface {
  lastActivity: number;
  lastSent: number;
  currentBranch: string;
  fullFileName: string;
  lastHeartbeat: Heartbeat | null;
  heartbeatBuffer: Heartbeat[];
  lastRegister: number;
  interval: NodeJS.Timeout | null;
}

export type EventType =
  | "changeInFile"
  | "screenScrolling"
  | "switchFile"
  | "cursorMove"
  | "branchChange";