// export interface CodingTime {
//     date: string
//     totalSeconds: number
//     projects: { name: string; seconds: number }[]
//     editors: { name: string; seconds: number }[]
//     languages: { technology: string; seconds: number }[]
//     operatingSystems: { system: string; seconds: number }[]
//     createAt?: Date
//     updateAt?: Date
// }

export interface CodingTime {
    // id: string,
    language: string
    filePath: string
    project: string
    editor: string
    branch: string
    os: string
    duration: number
    startTime: number
    endTime: number
}

export type EventType = 'edit' | 'save' | 'screenScrolling' | 'switchFile' | 'cursorMove' | 'workspaceChange'
export interface ActivityState {
    lastActivity: number,
    lastCodingTime: CodingTime | null,
    codingTimeArray: CodingTime[]
}

// type Values = Record<string, number>