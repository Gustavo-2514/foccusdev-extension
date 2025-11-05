import * as vscode from 'vscode';
import { CodingTime } from './types/types';
import registerActivity from './helpers/activity';

export async function activate(context: vscode.ExtensionContext) {
    console.log("✅ Extension activated successfully!")
    const state = {
        lastActivity: 0,
        lastCodingTime: null as CodingTime | null, // verify if exists some array in cache for handlers offline
        codingTimeArray: [] as CodingTime[],
    };
    try {
        const listeners: vscode.Disposable[] = [];
        listeners.push(
            // triggered when the user types
            vscode.workspace.onDidChangeTextDocument(async (event) => {
                if (!event.document) return;
                const fullFileName = event.document.fileName;
                await registerActivity({ eventType: 'edit', fullFileName, state });
            }),

            // triggered when the user changes files (including switching to an already open file)
            vscode.window.onDidChangeActiveTextEditor(async (editor) => {
                if (!editor) return;
                const fullFileName = editor.document.fileName;
                if (fullFileName.includes('.git')) {
                    return
                };
                await registerActivity({ eventType: 'switchFile', fullFileName, state });
            }),

            // triggered when the user scrolls the screen
            vscode.window.onDidChangeTextEditorVisibleRanges(async (editor) => {
                if (!editor) return;
                const fullFileName = editor.textEditor.document.fileName
                await registerActivity({ eventType: 'cursorMove', fullFileName, state });
            }),

            // triggered when the user saves (Ctrl+S)
            vscode.workspace.onDidSaveTextDocument(async (document) => {
                const fullFileName = document.fileName;
                await registerActivity({ eventType: 'save', fullFileName, state });
            }),

            // triggered when the user moves the cursor, selects text 
            vscode.window.onDidChangeTextEditorSelection(async (event) => {
                const fullFileName = event.textEditor.document.fileName;
                await registerActivity({ eventType: 'cursorMove', fullFileName, state });
            }),

            // triggered when the user changes workspace (project)
            vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
                const fullFileName = event.added.map(f => f.name).join(", ");
                await registerActivity({ eventType: 'workspaceChange', fullFileName, state });
            })
        );
        
        context.subscriptions.push( // undertand it after
            ...listeners,
            // ...commands
            { dispose() { } })

    } catch (error) {
        console.error('Error initializing extension:', error)
    }
}
