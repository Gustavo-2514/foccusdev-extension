export interface TimeRegister {
    date: string
    totalSeconds: number
    projects: { name: string; seconds: number }[]
    editors: { name: string; seconds: number }[]
    languages: { technology: string; seconds: number }[]
    operatingSystems: { system: string; seconds: number }[]
    createAt?: Date
    updateAt?: Date
}