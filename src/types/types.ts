export interface CodingTime {
    date: string
    totalSeconds: number
    projects: { name: string; seconds: number }[]
    editors: { name: string; seconds: number }[]
    languages: { technology: string; seconds: number }[]
    operatingSystems: { system: string; seconds: number }[]
    createAt?: Date
    updateAt?: Date
}

type Values = Record<string, number>

export type CodingTimeObj = {
    date: string
    totalSeconds: number
    editors: Values
    languages: Values
    projects: Values
    operatingSystems: Values
}