import { platform } from "os";
import { TimeRegister } from "../types/types";

// const updateHoursSpent = ({ hoursSpentArray, projectName, date }: { hoursSpentArray: HoursSpent[], projectName: string, date: Date }) => {
//     const position = hoursSpentArray.map((obj) => {
//         const currentDate = new Date()
//         const objDate = obj.date
//         const check = currentDate.getDate() == objDate.getDate() && currentDate.getMonth() == objDate.getMonth() && currentDate.getFullYear() == objDate.getFullYear()

//         if (check) {

//         }
//     })
// }

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
        case 'darwin': return 'macOS'
        case 'win32': return 'Windows'
        case 'linux': return 'Linux'
        default: return 'Outro'
    }
}