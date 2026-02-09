import * as vscode from "vscode";
import { registerActivity } from "./helpers/activity.js";
import { LocalDatabase } from "./database/db.js";
import { ActivityState } from "./activity-state.js";


export async function activate(context: vscode.ExtensionContext) {
  console.log("✅ Extension activated successfully!");
  try {
    const DB = await LocalDatabase.init(context);
    const state = await ActivityState.init(context);
    // ----------- COMMANDS -----------
   

    // ----------- EVENTS -----------
    // triggered when the user changes the git branch
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (gitExtension) {
      const git = gitExtension.getAPI(1);
      git.repositories.forEach((repo: any) => {
        repo.state.onDidChange(async () => {
          const currentBranch = repo.state.HEAD?.name;
          const stateBranch = state.getCurrentBranch();

          if (stateBranch === "") {
            state.setCurrentBranch(currentBranch || "");
            return;
          } else if (currentBranch === stateBranch) return;

          state.setCurrentBranch(currentBranch || "");
          await registerActivity(context, { eventType: "branchChange", state });
        });
      });
    }

    const listeners: vscode.Disposable[] = [];
    listeners.push(
      // triggered when the user types or saves the file
      vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (!event.document) return;
        if (event.contentChanges.length === 0) return;

        state.setFullFileName(event.document.fileName);
        await registerActivity(context, {
          eventType: "changeInFile",
          state,
          source: "human",
        });
      }),

      // triggered when the user changes files (including switching to an already open file)
      vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (!editor) return;
        state.setFullFileName(editor.document.fileName);
        if (state.getRawFileName().includes(".git")) {
          return;
        }
        await registerActivity(context, { eventType: "switchFile", state });
      }),

      // triggered when the user scrolls the screen
      vscode.window.onDidChangeTextEditorVisibleRanges(async (editor) => {
        if (!editor) return;
        state.setFullFileName(editor.textEditor.document.fileName);
        await registerActivity(context, {
          eventType: "screenScrolling",
          state,
        });
      }),

      // triggered when the user moves the cursor, selects text
      vscode.window.onDidChangeTextEditorSelection(async (event) => {
        if (!event) return;
        state.setFullFileName(event.textEditor.document.fileName);
        await registerActivity(context, { eventType: "cursorMove", state });
      }),
    );

    context.subscriptions.push({
      dispose: () => DB.close(),
    });
  } catch (error) {
    console.error("Error initializing extension:", error);
  }
}
