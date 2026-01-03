export interface Heartbeat {
    id: string,
    timestamp: number
    filePath: string
    language: string
    project: string
    editor: string
    branch: string
    os: string
    sent: number
}

export type EventType = 'edit' | 'save' | 'screenScrolling' | 'switchFile' | 'cursorMove' | 'workspaceChange'
export interface ActivityState {
    lastActivity: number
    lastSent: number
    fullFileName: string
    lastHeartbeat: Heartbeat | null
    heartbeatBuffer: Heartbeat[]
    lastRegister: number
    interval: NodeJS.Timeout | null
}