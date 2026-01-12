import path from "path";
const { v4: uuidv4 } = require("uuid");

import {
  getBranchName,
  getEditorName,
  getOSName,
  getProjectName,
} from "./get-values.js";
import { ActivityState, Heartbeat } from "../types/types.js";
import { PUBLIC_API_URL, SEND_HEARTBEAT_BUFFER_MS } from "./const.js";
import { getApiKey } from "./utils.js";
import { ExtensionContext } from "vscode";

export const createAndSaveHeartbeat = async (
  context: ExtensionContext,
  { state }: { state: ActivityState }
) => {
  try {
    const filePath = state.fullFileName.split(path.sep).slice(3).join("/");
    const language = path.extname(filePath).replace(".", "");
    const branch = await getBranchName();

    const newHeartbeat = {
      id: uuidv4(),
      language,
      filePath,
      branch: branch,
      editor: getEditorName(),
      project: getProjectName(),
      os: getOSName(),
      timestamp: Math.floor(Date.now() / 1000),
    } satisfies Heartbeat;

    state.lastHeartbeat = newHeartbeat;
    state.heartbeatBuffer.push(newHeartbeat);

    if (Date.now() - state.lastSent > SEND_HEARTBEAT_BUFFER_MS) {
      await saveHeartbeat(context, { state });
    }
  } catch (error) {
    console.warn("Error to try save in DB");
  }
};

export const saveHeartbeat = async (
  context: ExtensionContext,
  { state }: { state: ActivityState }
): Promise<boolean> => {
  try {
    console.log("saved on sever");
    console.log("====================");
    return true;
    // example request
    // const apiKey = await getApiKey(context);
    // if (!apiKey) return false;

    // const response = await fetch(PUBLIC_API_URL, {
    //   headers: {
    //     "Content-Type": "application/json",
    //     "x-api-key": apiKey,
    //   },
    //   method: "POST",
    //   body: JSON.stringify(state.heartbeatBuffer),
    // });

    // if (response.ok) {
    //   state.heartbeatBuffer = [];
    //   state.lastSent = Date.now();
    //   return true;
    // } else {
    //   return false;
    // }
  } catch (error) {
    return false;
  }
};
