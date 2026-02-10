import * as vscode from "vscode";
import path from "path";
import { Heartbeat, SourceType } from "./types/types";
import {
  DEBOUNCEMS,
  FLUSHTIME,
  MAXIMUM_TIME_LIMIT_PER_HEARTBEAT,
} from "./helpers/const";

export class ActivityState {
  private lastActivity: number = 0;
  private lastSent: number = Date.now();
  private lastHeartbeat: Heartbeat | null = null;
  private heartbeatBuffer: Heartbeat[] = [];
  private lastRegister = 0;
  private interval: NodeJS.Timeout | null = null;
  // private lastSource: string = "";
  private fullFileName: string = "";
  private currentBranch: string = "";

  private constructor() {}

  public static async init(context: vscode.ExtensionContext) {
    const state = new ActivityState();
    return state;
  }


  public get heartbeatBufferData() {
    return this.heartbeatBuffer;
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
      now - (this.lastHeartbeat?.timestamp ?? 0) * 1000 >= MAXIMUM_TIME_LIMIT_PER_HEARTBEAT
    );
  }

  public hasHeartbeat(): boolean {
    return this.lastHeartbeat !== null;
  }

  public pushHeartbeat(hb: Heartbeat) {
    this.lastHeartbeat = hb;
    this.heartbeatBuffer.push(hb);
    console.log('criei e salvei db no state');
    
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
    const flushTimeExceeded = Date.now() - this.lastSent > FLUSHTIME;
    return flushTimeExceeded;
  }

  public markFlushed() {
    this.lastSent = Date.now();
    this.heartbeatBuffer = [];
  }

  public markActivity() {
    this.lastActivity = Date.now();
  }

  public compareSources(sourceDetected: SourceType): boolean {
    let value = this.lastHeartbeat!.source !== sourceDetected;
    return value;
  }

  public resetHeartbeatState() {
    this.clearTimeout();
    this.lastHeartbeat = null;
    this.heartbeatBuffer = [];
    this.lastSent = Date.now();
    this.lastRegister = 0;
  }
}
