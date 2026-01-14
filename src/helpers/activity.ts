import { ActivityStateInterface, EventType } from "../types/types.js";
import { frequentEvents, INACTIVITY_LIMIT, structuralEvents } from "./const.js";
import { ExtensionContext } from "vscode";
import { createHeartbeat, flushHeartbeat } from "./heartbeat.js";
import { ActivityState } from "../activity-state.js";

export const exceededHBLimit = ({
  state,
}: {
  state: ActivityStateInterface;
}): { exceededLimit: boolean } => {
  const now = Date.now();
  return {
    exceededLimit:
      now - (state.lastHeartbeat?.timestamp ?? 0) * 1000 >= INACTIVITY_LIMIT,
  };
};

export const registerActivity = async (
  context: ExtensionContext,
  { eventType, state }: { eventType: EventType; state: ActivityState }
): Promise<void> => {
  try {
    if (state.shouldDebounce()) return;
    if (!state.getRawFileName()) return;

    //if it´s the first criation
    if (!state.hasHeartbeat()) {
      createHeartbeat({ state });
      return;
    }

    if (frequentEvents.includes(eventType)) {
      const exeeded = state.exceededHBLimit();
      if (exeeded) {
        createHeartbeat({ state });
      }
    } else if (structuralEvents.includes(eventType)) {
      state.schedule(async () => {
        createHeartbeat({ state });
      }, 1500);
    }

    const flushTimeExceeded = state.shouldFlush();
    if (flushTimeExceeded) {
      await flushHeartbeat(context, { state });
    }
  } finally {
    state.markActivity();
  }
};
