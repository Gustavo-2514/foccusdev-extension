import path from "path";

import { getBranchName, getEditorName, getOSName, getProjectName } from "./get-values";
import { ActivityState, CodingTime } from "../types/types";
import { exceededInactivityLimit, INACTIVITY_ALLOWED } from "./activity";

export const createCodingTime = async ({ fullFileName }: { fullFileName: string }): Promise<CodingTime> => {
    const now = Date.now()
    const filePath = fullFileName.split(path.sep).slice(3).join('/');
    const language = path.extname(filePath).replace('.', '')
    const branch = await getBranchName()

    return {
        language,
        filePath,
        branch: branch,
        editor: getEditorName(),
        project: getProjectName(),
        os: getOSName(),
        duration: 0,
        startTime: now,
        endTime: 0,
    } as CodingTime
}

export const closeLastCodingTime = async ({ lastActivity, lastCodingTime, exceededAllowedLimit, }: { lastActivity: number, lastCodingTime: CodingTime, exceededAllowedLimit: boolean }) => {
    if (exceededAllowedLimit) lastCodingTime.duration = Math.round(((lastActivity + INACTIVITY_ALLOWED) - lastCodingTime.startTime) / 1000);
    else lastCodingTime.duration = Math.round((Date.now() - lastCodingTime.startTime) / 1000);;
    lastCodingTime.endTime = Math.min(Date.now(), lastActivity + INACTIVITY_ALLOWED);
    return lastCodingTime;
}

export const finalizeAndCreateNew = async ({ state, fullFileName, exceededAllowedLimit }: { state: ActivityState, fullFileName: string, exceededAllowedLimit: boolean }) => {
    const changed = await closeLastCodingTime({
        lastActivity: state.lastActivity,
        lastCodingTime: state.lastCodingTime!,
        exceededAllowedLimit
    });
    state.hasCodingTimeOpen = false
    state.codingTimeArray.push(changed);
    state.lastCodingTime = await createCodingTime({ fullFileName });
    state.hasCodingTimeOpen = true
}

export const saveAndCloseCodingTime = async ({ state, fullFileName }: { state: ActivityState, fullFileName: string }) => {
    if (!state.hasCodingTimeOpen || !state.lastCodingTime || !fullFileName) return;
    const { exceededAllowedLimit } = exceededInactivityLimit({ lastActivity: state.lastActivity });
    if (exceededAllowedLimit) {
        const closed = await closeLastCodingTime({
            exceededAllowedLimit,
            lastActivity: state.lastActivity,
            lastCodingTime: state.lastCodingTime
        });
        state.codingTimeArray.push(closed);
        state.hasCodingTimeOpen = false;
    } else {
        await finalizeAndCreateNew({ state, fullFileName, exceededAllowedLimit });
    }
};
