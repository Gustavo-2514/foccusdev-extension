import { EventType, SourceType } from "../types/types.js";
import { frequentEvents, structuralEvents } from "./const.js";
import { ExtensionContext } from "vscode";
import { createHeartbeat, flushHeartbeat } from "./heartbeat.js";
import { ActivityState } from "../activity-state.js";

export const registerActivity = async (
  context: ExtensionContext,
  {
    eventType,
    state,
    source = "human",
  }: { eventType: EventType; state: ActivityState; source?: SourceType },
): Promise<void> => {
  try {
    if (state.shouldDebounce()) return;
    if (!state.getRawFileName()) return;

    if (!state.hasHeartbeat()) {
      createHeartbeat({ state });
      return;
    }

    if (frequentEvents.includes(eventType)) {
      const exeeded = state.exceededHBLimit();
      if (exeeded) {
        createHeartbeat({ state, source });
      }
    } else if (structuralEvents.includes(eventType)) {
      state.schedule(async () => {
        createHeartbeat({ state, source });
      }, 1500);
    }

    const flushTimeExceeded = state.shouldFlush();
    if (flushTimeExceeded && state.heartbeatBufferData.length > 0) {
      await flushHeartbeat({ state });
    }

  } finally {
    state.markActivity();
  }
};
