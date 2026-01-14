import * as vscode from "vscode";
import { platform } from "os";

export const getBranchName = async (): Promise<string> => {
  try {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    const git = gitExtension?.getAPI(1);
    if (!git || git.repositories.length === 0) return "";
    const repo = git.repositories[0];
    return repo.state.HEAD?.name || "";
  } catch {
    return "";
  }
};

export const getEditorName = (): string => {
  const editor = vscode.env.appName.toLowerCase();
  if (editor.includes("code")) return "VS Code";
  if (editor.includes("cursor")) return "Cursor";
  if (editor.includes("antigravity")) return "Antigravity";
  if (editor.includes("codium")) return "VSCodium";
  if (editor.includes("insiders")) return "VS Code Insiders";
  if (editor.includes("windsurf")) return "Windsurf";
  if (editor.includes("oss")) return "Code OSS";
  if (vscode.env.remoteName === "codespaces") return "GitHub Codespaces";
  if (vscode.env.uiKind === vscode.UIKind.Web) return "VS Code Web";

  return "Outros";
};

export const getProjectName = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder ? folder.name : "Sem projeto";
};

export const getOSName = (): string => {
  switch (platform()) {
    case "darwin":
      return "MacOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return "Outro";
  }
};
