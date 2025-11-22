import { ActivityState, EventType } from "../types/types.js"
import { DEBOUNCEMS, frequentEvents, INACTIVITY_LIMIT, structuralEvents } from "./const.js";
import { ExtensionContext } from "vscode";
import { createAndSaveHeartbeat } from "./heartbeat.js";

const debounceActivity = (state: ActivityState): boolean => {
    const now = Date.now()
    const isDebounced = now - state.lastRegister < DEBOUNCEMS
    if (!isDebounced) state.lastRegister = now
    return isDebounced
}

export const exceededInactivityLimit = ({ state }: { state: ActivityState }): { exceededLimit: boolean } => {
    const now = Date.now()
    return { exceededLimit: now - state.lastActivity >= INACTIVITY_LIMIT }
}

export const registerActivity = async (context: ExtensionContext, { eventType, state }: { eventType: EventType, state: ActivityState }): Promise<void> => {
    try {
        if (debounceActivity(state)) return
        if (!state.fullFileName) return;

        //if it´s the first criation
        if (!state.lastHeartbeat) {
            await createAndSaveHeartbeat(context, { state })
            return
        }

        const { exceededLimit } = exceededInactivityLimit({ state })
        if (frequentEvents.includes(eventType)) {
            if (exceededLimit) await createAndSaveHeartbeat(context, { state })

        } else if (structuralEvents.includes(eventType)) {
            if (state.interval) {
                clearTimeout(state.interval);
            }
            state.interval = setTimeout(async () => {
                await createAndSaveHeartbeat(context, { state })
            }, 1500);
        }

    } finally {
        state.lastActivity = Date.now();
    }
};