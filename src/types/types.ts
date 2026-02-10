export type SourceType = "human" | "ai" | "debugging";

export interface Heartbeat {
  id: string;
  timestamp: number;
  filePath: string;
  language: string;
  project: string;
  branch: string;
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


export interface TimedHeartbeat extends Heartbeat {
  durationSeconds: number;
}

export interface RankedItem {
  label: string;
  seconds: number;
}

export interface DayInsight {
  dayLabel: string;
  totalSeconds: number;
  topLanguage: RankedItem | null;
  topFile: RankedItem | null;
  topProject: RankedItem | null;
}
