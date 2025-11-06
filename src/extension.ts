import * as vscode from 'vscode';
import { ActivityState } from './types/types';
import registerActivity, { exceededInactivityLimit } from './helpers/activity';
import { closeLastCodingTime, finalizeAndCreateNew, saveAndCloseCodingTime } from './helpers/codingTime';

export async function activate(context: vscode.ExtensionContext) {
    console.log("✅ Extension activated successfully!")
    const state: ActivityState = {
        lastActivity: 0,
        hasCodingTimeOpen: false,
        lastCodingTime: null, // verify if exists some array in cache for handlers offline
        codingTimeArray: [],
    };

    let fullFileName = ''
    let sendCodingTimeInterval: NodeJS.Timeout;
    let saveCodingTimeInterval: NodeJS.Timeout;

    try {
        const listeners: vscode.Disposable[] = [];
        listeners.push(
            // triggered when the user types
            vscode.workspace.onDidChangeTextDocument(async (event) => {
                if (!event.document) return;
                fullFileName = event.document.fileName;
                await registerActivity({ eventType: 'edit', fullFileName, state });
            }),

            // triggered when the user changes files (including switching to an already open file)
            vscode.window.onDidChangeActiveTextEditor(async (editor) => {
                if (!editor) return;
                fullFileName = editor.document.fileName;
                if (fullFileName.includes('.git')) {
                    return
                };
                await registerActivity({ eventType: 'switchFile', fullFileName, state });
            }),

            // triggered when the user scrolls the screen
            vscode.window.onDidChangeTextEditorVisibleRanges(async (editor) => {
                if (!editor) return;
                fullFileName = editor.textEditor.document.fileName
                await registerActivity({ eventType: 'cursorMove', fullFileName, state });
            }),

            // triggered when the user saves (Ctrl+S)
            vscode.workspace.onDidSaveTextDocument(async (document) => {
                fullFileName = document.fileName;
                await registerActivity({ eventType: 'save', fullFileName, state });
            }),

            // triggered when the user moves the cursor, selects text 
            vscode.window.onDidChangeTextEditorSelection(async (event) => {
                fullFileName = event.textEditor.document.fileName;
                await registerActivity({ eventType: 'cursorMove', fullFileName, state });
            }),

            // triggered when the user changes workspace (project)
            vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
                fullFileName = event.added.map(f => f.name).join(", ");
                await registerActivity({ eventType: 'workspaceChange', fullFileName, state });
            })
        );

        saveCodingTimeInterval = setInterval(async () => await saveAndCloseCodingTime({ state, fullFileName }), 2000)

        context.subscriptions.push(
            ...listeners,
            // ...commands
            {
                dispose() {
                    clearInterval(saveCodingTimeInterval)
                    listeners.forEach((listener) => listener.dispose())
                }
            })

    } catch (error) {
        console.error('Error initializing extension:', error)
    }
}
