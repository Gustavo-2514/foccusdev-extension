import { platform } from "os";
import { CodingTimeObj } from "../types/types";

// const addTime = (key: keyof Omit<CodingTime, 'date' | 'totalSeconds'>, name: string, seconds: number) => {

export const addTime = ({ codingTime, seconds, project, editor, language, os }:
    { codingTime: CodingTimeObj, seconds: number, project: string, editor: string, language: string, os: string }): CodingTimeObj => {

    codingTime.totalSeconds += seconds
    codingTime.projects[project] = (codingTime.projects[project] ?? 0) + seconds
    codingTime.editors[editor] = (codingTime.editors[editor] ?? 0) + seconds
    codingTime.languages[language] = (codingTime.languages[language] ?? 0) + seconds
    codingTime.operatingSystems[os] = (codingTime.operatingSystems[os] ?? 0) + seconds

    return codingTime
}

export const createNewCodingTime = (date: string) => {
    return {
        date,
        totalSeconds: 0,
        editors: {},
        languages: {},
        operatingSystems: {},
        projects: {}
    } as Omit<CodingTimeObj, 'createAt' | 'updateAt'>
}

export const getEditorName = () => {
    let editor = process.env.VSCODE_APP_NAME?.toLowerCase() ?? "Outro"

    if (editor.includes('cursor')) {
        return 'Cursor'
    } else if (editor.includes('code')) {
        return 'VS Code'
    } else if (editor.includes('codium')) {
        return 'VSCodium'
    } else {
        return 'Outro'
    }
}

export const getOSName = () => {
    let os = platform()
    switch (os) {
        case 'darwin': return 'MacOS'
        case 'win32': return 'Windows'
        case 'linux': return 'Linux'
        default: return 'Outro'
    }
}

export const checkIfIsNewDay = ({ firstDate, secondDate }: { firstDate: Date, secondDate: Date }): { isNewDay: boolean, date: string } => {
    if (firstDate.getFullYear() === secondDate.getFullYear()
        && firstDate.getMonth() === secondDate.getMonth() && firstDate.getDate() === secondDate.getDate()) {
        return { isNewDay: true, date: new Date().toISOString().split('T')[0] }
    } else {
        return { isNewDay: false, date: '' }
    }
}