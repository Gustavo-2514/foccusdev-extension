import path from "path";
import { ActivityStateInterface, Heartbeat } from "./types/types";
import { getEditorName, getOSName } from "./helpers/get-values";
import { DEBOUNCEMS, FLUSHTIME, INACTIVITY_LIMIT } from "./helpers/const";
import { ExtensionContext } from "vscode";

export class ActivityState {
  private lastActivity: number = 0;
  private lastSent: number = Date.now();
  private lastHeartbeat: Heartbeat | null = null;
  private heartbeatBuffer: Heartbeat[] = [];
  private lastRegister = 0;
  private interval: NodeJS.Timeout | null = null;

  private fullFileName: string = "";
  private os: string = getOSName();
  private editor: string = getEditorName();
  private currentBranch: string = "";

  constructor() {}

  public get heartbeatBufferData() {
    return this.heartbeatBuffer;
  }

  public getPermanentValues() {
    return {
      os: this.os,
      editor: this.editor,
    };
  }

  public getRawFileName() {
    return this.fullFileName;
  }

  public getNormalizedFilePath() {
    return this.fullFileName.split(path.sep).slice(3).join("/");
  }

  public setFullFileName(fileName: string) {
    this.fullFileName = fileName;
  }

  public getCurrentBranch(): string {
    return this.currentBranch;
  }

  public setCurrentBranch(branch: string) {
    this.currentBranch = branch;
  }

  public shouldDebounce(): boolean {
    const now = Date.now();
    if (now - this.lastRegister < DEBOUNCEMS) return true;
    this.lastRegister = now;
    return false;
  }

  public exceededHBLimit(): boolean {
    const now = Date.now();
    return (
      now - (this.lastHeartbeat?.timestamp ?? 0) * 1000 >= INACTIVITY_LIMIT
    );
  }

  public hasHeartbeat(): boolean {
    return this.lastHeartbeat !== null;
  }

  public pushHeartbeat(hb: Heartbeat) {
    this.lastHeartbeat = hb;
    this.heartbeatBuffer.push(hb);
  }

  public schedule(fn: () => Promise<void>, delay: number) {
    this.clearTimeout();
    this.interval = setTimeout(fn, delay);
  }

  public clearTimeout() {
    if (this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }
  }

  public shouldFlush() {
    return Date.now() - this.lastSent > FLUSHTIME;
  }

  public markFlushed() {
    this.lastSent = Date.now();
    this.heartbeatBuffer = [];
  }

  public markActivity() {
    this.lastActivity = Date.now();
  }
}
