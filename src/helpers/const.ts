import { EventType } from "../types/types";

// constants
export const INACTIVITY_LIMIT = 90000; // 90s
export const MAXIMUM_TIME_LIMIT_PER_HEARTBEAT = 120000; // 120s (Each heartbeat should be a maximum of 2 minutes)
export const DEBOUNCEMS = 600; // 0.6s
export const FLUSHTIME = 60000; // 60s - 1m
export const PUBLIC_API_URL = "";
export const API_KEY_DISMISSED = "apiKeyDismissed";

export const DB_MAX_SIZE_SETTING_KEY = "dbMaxSizeMb";
export const DB_MAX_SIZE_MIN_MB = 15; // 15mb
export const DB_MAX_SIZE_MAX_MB = 100; // 100mb
export const DB_MAX_SIZE_DEFAULT_MB = 20; // 20mb

export const INACTIVITY_LIMIT_SECONDS = Math.floor(INACTIVITY_LIMIT / 1000);
const HEARTBEAT_MAX_SECONDS = Math.floor(
  MAXIMUM_TIME_LIMIT_PER_HEARTBEAT / 1000,
);
export const EFFECTIVE_HEARTBEAT_SECONDS_LIMIT = Math.min(
  INACTIVITY_LIMIT_SECONDS,
  HEARTBEAT_MAX_SECONDS,
);
export const TRAILING_HEARTBEAT_SECONDS = 60;
export const MINIMUM_DISPLAY_SECONDS = 60;
export const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];



// event types
export const frequentEvents: EventType[] = [
  "changeInFile",
  "screenScrolling",
  "cursorMove",
];
export const structuralEvents: EventType[] = ["switchFile", "branchChange"];
