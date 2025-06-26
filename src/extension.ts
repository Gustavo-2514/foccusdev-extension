// // The module 'vscode' contains the VS Code extensibility API
// // Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TimeRegister } from './types/types';


let isTyping = false;
let lastActivity = Date.now();
let interval: NodeJS.Timeout;
let totalSeconds = 0
let language: string | undefined;
let projetctName: string | undefined;
let hoursSpentArray = [] as TimeRegister[]

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

    interval = setInterval(() => {
        let now = Date.now()
        if (isTyping && now - lastActivity <= 60 * 1000) {
            isTyping = false
            totalSeconds += 5
            console.log('total seconds: ' + totalSeconds);
        } else {
            isTyping = false
        }
    }, 5000)


    

    context.subscriptions.push({
        dispose() {
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
