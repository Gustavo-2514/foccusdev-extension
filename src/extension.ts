import * as vscode from "vscode";
import { ActivityState } from "./types/types.js";
import { registerActivity } from "./helpers/activity.js";
import { LocalDatabase } from "./database/db.js";

export async function activate(context: vscode.ExtensionContext) {
  console.log("✅ Extension activated successfully!");

  const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
  if (!gitExtension) return;

  const DB = await LocalDatabase.init(context);
  const state: ActivityState = {
    lastActivity: 0,
    lastSent: 0,
    fullFileName: "",
    currentBranch: "",
    lastHeartbeat: null,
    heartbeatBuffer: [],
    interval: null,
    lastRegister: 0,
  };

  try {
    const git = gitExtension.getAPI(1);
    git.repositories.forEach((repo: any) => {
      repo.state.onDidChange(async () => {
        const branch = repo.state.HEAD?.name;
        if (state.currentBranch === "") {
          state.currentBranch = branch || "";
          return;
        } else if (branch === state.currentBranch) return;

        state.currentBranch = branch || "";
        await registerActivity(context, { eventType: "branchChange", state });
      });
    });

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
      })
    );

    context.subscriptions.push({
      dispose: () => DB.close(),
    });
  } catch (error) {
    console.error("Error initializing extension:", error);
  }
}
