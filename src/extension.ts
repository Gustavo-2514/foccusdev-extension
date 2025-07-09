// // The module 'vscode' contains the VS Code extensibility API
// // Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CodingTime, CodingTimeObj } from './types/types';
import { addTime, checkIfIsNewDay, createNewCodingTime, getEditorName, getOSName } from './helpers/helpers';

let isTyping = false;
let lastActivity = Date.now();
let interval: NodeJS.Timeout;
let totalSeconds = 0
let language: string | undefined;
let projetctName: string | undefined;
let hoursSpentArray = [] as CodingTime[]

export function acticvate(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeTextDocument(() => {
        lastActivity = Date.now()
        language = vscode.window.activeTextEditor?.document.languageId;
        projetctName = vscode.window.activeTextEditor?.document.fileName;

        if (!isTyping) {
            isTyping = true
            console.log('User started typing...');
        }
    })

    // save in cache
    interval = setInterval(async () => {
        let now = Date.now()
        if (isTyping && now - lastActivity <= 60 * 1000) {

            totalSeconds += 5
            console.log('total seconds: ' + totalSeconds);

            const { isNewDay, date } = checkIfIsNewDay({ firstDate: new Date(lastActivity), secondDate: new Date() })

            let getCache = context.globalState.get<CodingTimeObj[]>('codingTime') || undefined
            if (!getCache) {
                const codingTime = createNewCodingTime(date)
                getCache = [codingTime]
            }

            const editor = getEditorName()
            const os = getOSName()

            if (isNewDay) {
                const newDate = new Date().toISOString().split('T')[0]
                const newCodingTime = createNewCodingTime(newDate)
                const codingTimeUpdated = addTime({ codingTime: newCodingTime, editor, os, language: language as string, project: projetctName as string, seconds: totalSeconds as number })
                await context.globalState.update('codingTime', getCache.push(codingTimeUpdated))
            } else {
                const lastCodingTime = getCache[getCache.length - 1]
                const codingTimeUpdated = addTime({ codingTime: lastCodingTime, editor, os, language: language as string, project: projetctName as string, seconds: totalSeconds as number })
                await context.globalState.update('codingTime', [codingTimeUpdated])
            }

        } else {
            isTyping = false
        }

    }, 5000)

    // save values in DB
    // save values in DB

    context.subscriptions.push({
        dispose() {
            //salvar antes de sair
            //salvar antes de sair
            //salvar antes de sair
            clearInterval(interval)
        }
    })
}

// // This method is called when your extension is activated
// // Your extension is activated the very first time the command is executed
// export function activate(context: vscode.ExtensionContext) {

// 	// Use the console to output diagnostic information (console.log) and errors (console.error)
// 	// This line of code will only be executed once when your extension is activated
// 	console.log('Congratulations, your extension "foccusdev" is now active!');

// 	// The command has been defined in the package.json file
// 	// Now provide the implementation of the command with registerCommand
// 	// The commandId parameter must match the command field in package.json
// 	const disposable = vscode.commands.registerCommand('foccusdev.helloWorld', () => {
// 		// The code you place here will be executed every time your command is executed
// 		// Display a message box to the user
// 		vscode.window.showInformationMessage('Hello World from FoccusDEV!');
// 	});

// 	context.subscriptions.push(disposable);
// }

// // This method is called when your extension is deactivated
// export function deactivate() {}
