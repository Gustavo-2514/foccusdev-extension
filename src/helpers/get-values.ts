import * as vscode from 'vscode';
import { platform } from 'os';

export const getBranchName = async (): Promise<string> => {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        const git = gitExtension?.getAPI(1);
        if (!git || git.repositories.length === 0) return '';
        const repo = git.repositories[0];
        return repo.state.HEAD?.name || '';
    } catch {
        return '';
    }
};

export const getEditorName = (): string => {
    const editor = vscode.env.appName.toLowerCase();
    if (editor.includes('cursor')) return 'Cursor';
    if (editor.includes('code')) return 'VS Code';
    if (editor.includes('codium')) return 'VSCodium';
    return 'Outro';
};

export const getProjectName = (): string => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder ? folder.name : 'Sem projeto';
};

export const getOSName = (): string => {
    switch (platform()) {
        case 'darwin': return 'MacOS';
        case 'win32': return 'Windows';
        case 'linux': return 'Linux';
        default: return 'Outro';
    }
};
