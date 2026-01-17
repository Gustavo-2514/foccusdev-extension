import { EventType } from "../types/types";

export const INACTIVITY_LIMIT = 120000; // 120s
export const DEBOUNCEMS = 600; // 0.6s
export const FLUSHTIME = 30000; // 30s

// string constants
export const PUBLIC_API_URL = "";
export const API_KEY_DISMISSED = "apiKeyDismissed";

export const frequentEvents: EventType[] = ["changeInFile", "screenScrolling", "cursorMove" , ];
export const structuralEvents: EventType[] = ["switchFile", "branchChange"];