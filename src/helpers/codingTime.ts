import path from "path";

import { getBranchName, getEditorName, getOSName, getProjectName } from "./get-values";
import { ActivityState, CodingTime } from "../types/types";
import { INACTIVITY_ALLOWED } from "./activity";

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

export const closeLastCodingTime = async ({ lastActivity, lastCodingTime, exceededAllowedLimit }: { lastActivity: number, lastCodingTime: CodingTime, exceededAllowedLimit: boolean }) => {
    if (exceededAllowedLimit) lastCodingTime.duration = Math.round(((lastActivity + INACTIVITY_ALLOWED) - lastCodingTime.startTime) / 1000);
    else lastCodingTime.duration = Math.round((Date.now() - lastCodingTime.startTime) / 1000); ;
    lastCodingTime.endTime = Math.min(Date.now(), lastActivity + INACTIVITY_ALLOWED);
    return lastCodingTime;
}

export const finalizeAndCreateNew = async (state: ActivityState, fullFileName: string, exceededAllowedLimit: boolean) => {
    const changed = await closeLastCodingTime({
        lastActivity: state.lastActivity,
        lastCodingTime: state.lastCodingTime!,
        exceededAllowedLimit
    });
    state.codingTimeArray.push(changed);
    state.lastCodingTime = await createCodingTime({ fullFileName });
}