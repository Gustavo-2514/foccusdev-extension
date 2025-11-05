import { ActivityState, EventType } from "../types/types"
import { createCodingTime, finalizeAndCreateNew } from "./codingTime";

const INACTIVITY_LIMIT = 120000; // 120s
export const INACTIVITY_ALLOWED = 20000; // 20s

export const exceededInactivityLimit = ({ lastActivity }: { lastActivity: number }): { exceededLimit: boolean, exceededAllowedLimit: boolean } => {
    const now = Date.now()
    return {
        exceededLimit: now - lastActivity >= INACTIVITY_LIMIT,
        exceededAllowedLimit: now - lastActivity >= INACTIVITY_ALLOWED
    }
}

const registerActivity = async ({ eventType, fullFileName, state }: { eventType: EventType, fullFileName: string, state: ActivityState }) => {
    try {
        if (!fullFileName) return;

        const { exceededLimit, exceededAllowedLimit } = exceededInactivityLimit({ lastActivity: state.lastActivity })

        if (!state.lastCodingTime) {
            state.lastCodingTime = await createCodingTime({ fullFileName })
            return
        }

        switch (eventType) {
            case 'edit':
            case 'save':
            case 'screenScrolling':
            case 'cursorMove':
                if (exceededLimit) await finalizeAndCreateNew(state, fullFileName, exceededAllowedLimit);
                break;

            case 'switchFile':
            case 'workspaceChange':
                await finalizeAndCreateNew(state, fullFileName, exceededAllowedLimit);
                break;
        }
    } finally {
        state.lastActivity = Date.now();
    }
};

export default registerActivity