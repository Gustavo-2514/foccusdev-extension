import path from "path";
const { v4: uuidv4 } = require("uuid");

import { getProjectName } from "./get-values.js";
import { Heartbeat, SourceType } from "../types/types.js";
import { PUBLIC_API_URL } from "./const.js";
import { getApiKey } from "./utils.js";
import { ExtensionContext } from "vscode";
import { ActivityState } from "../activity-state.js";

export const createHeartbeat = ({
  state,
  source,
}: {
  state: ActivityState;
  source?: SourceType;
}) => {
  const filePath = state.getNormalizedFilePath();
  const language = path.extname(filePath).replace(".", "");
  const { editor, os } = state.getPermanentValues();

  const heartbeat: Heartbeat = {
    id: uuidv4(),
    language,
    filePath,
    branch: state.getCurrentBranch(),
    editor: editor,
    project: getProjectName(),
    os: os,
    timestamp: Math.floor(Date.now() / 1000),
    source: source || "human",
  } satisfies Heartbeat;

  state.pushHeartbeat(heartbeat);
};

export const flushHeartbeat = async (
  context: ExtensionContext,
  { state }: { state: ActivityState },
) => {
  try {
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
    //  state.markFlushed();
    //   return true;
    // } else {
    //   return false;
    // }
  } catch (error) {
    return false;
  }
};
