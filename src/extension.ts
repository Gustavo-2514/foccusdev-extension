import * as vscode from "vscode";
import { ActivityState } from "./types/types.js";
import { registerActivity } from "./helpers/activity.js";
import { LocalDatabase } from "./database/db.js";

export async function activate(context: vscode.ExtensionContext) {
  console.log("✅ Extension activated successfully!");
  LocalDatabase.init(context);

  const state: ActivityState = {
    lastActivity: 0,
    lastSent: 0,
    fullFileName: "",
    lastHeartbeat: null,
    heartbeatBuffer: [],
    interval: null,
    lastRegister: 0,
  };

  try {
    const listeners: vscode.Disposable[] = [];
    listeners.push(
      // triggered when the user types
      vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (!event.document) return;
        state.fullFileName = event.document.fileName;
        await registerActivity(context, { eventType: "edit", state });
      }),

      // triggered when the user changes files (including switching to an already open file)
      vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (!editor) return;
        state.fullFileName = editor.document.fileName;
        if (state.fullFileName.includes(".git")) {
          return;
        }
        await registerActivity(context, { eventType: "switchFile", state });
      }),

      // triggered when the user scrolls the screen
      vscode.window.onDidChangeTextEditorVisibleRanges(async (editor) => {
        if (!editor) return;
        state.fullFileName = editor.textEditor.document.fileName;
        await registerActivity(context, { eventType: "cursorMove", state });
      }),

      // triggered when the user saves (Ctrl+S)
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (!document) return;
        state.fullFileName = document.fileName;
        await registerActivity(context, { eventType: "save", state });
      }),

      // triggered when the user moves the cursor, selects text
      vscode.window.onDidChangeTextEditorSelection(async (event) => {
        if (!event) return;
        state.fullFileName = event.textEditor.document.fileName;
        await registerActivity(context, { eventType: "cursorMove", state });
      }),

      // triggered when the user changes workspace (project)
      vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
        state.fullFileName = event.added.map((f) => f.name).join(", ");
        await registerActivity(context, {
          eventType: "workspaceChange",
          state,
        });
      })
    );

    context.subscriptions.push(...listeners, {
      dispose() {
        listeners.forEach((listener) => listener.dispose());
      },
    });
  } catch (error) {
    console.error("Error initializing extension:", error);
  }
}
