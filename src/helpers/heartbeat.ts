import path from "path";
const { v4: uuidv4 } = require("uuid");

import { getProjectName } from "./get-values.js";
import { Heartbeat, SourceType } from "../types/types.js";
import { ActivityState } from "../activity-state.js";
import { LocalDatabase } from "../database/db.js";

export const createHeartbeat = ({
  state,
  source,
}: {
  state: ActivityState;
  source?: SourceType;
}) => {
  const filePath = state.getNormalizedFilePath();
  const language = path.extname(filePath).replace(".", "");

  const heartbeat: Heartbeat = {
    id: uuidv4(),
    language,
    filePath,
    branch: state.getCurrentBranch(),
    project: getProjectName(),
    timestamp: Math.floor(Date.now() / 1000),
    source: source || "human",
  } satisfies Heartbeat;

  state.pushHeartbeat(heartbeat);
};

export const flushHeartbeat = async ({ state }: { state: ActivityState }) => {
  try {
    const DB = LocalDatabase.get();
    const heartbeats = state.heartbeatBufferData;
    DB.insertHeartbeat(heartbeats);
    state.markFlushed();
    console.log('salvei no db');
    
  } catch (error) {
    return;
  }
};
